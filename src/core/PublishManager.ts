/**
 * 发布管理器 - 完整发布流程编排
 */

import { join } from 'path'
import { Listr } from 'listr2'
import type {
  PublisherConfig,
  PublishContext,
  PublishReport,
  PublishTask,
  PackageInfo,
  PackagePublishStatus,
} from '../types/index.js'
import { logger } from '../utils/logger.js'
import { createNpmClient } from '../utils/npm-client.js'
import { createRegistryManager } from './RegistryManager.js'
import { createVersionManager } from './VersionManager.js'
import { createDependencyResolver } from './DependencyResolver.js'
import { createChangelogGenerator } from './ChangelogGenerator.js'
import { createHookManager } from './HookManager.js'
import { createPublishAnalytics } from './PublishAnalytics.js'
import { PackageValidator } from '../validators/package-validator.js'
import { GitValidator } from '../validators/git-validator.js'
import { PublishError as PublishErr } from '../utils/error-handler.js'

/**
 * 发布管理器
 */
export class PublishManager {
  private config: PublisherConfig
  private registryManager: ReturnType<typeof createRegistryManager>
  private versionManager: ReturnType<typeof createVersionManager>
  private dependencyResolver: ReturnType<typeof createDependencyResolver>
  private changelogGenerator: ReturnType<typeof createChangelogGenerator>
  private hookManager: ReturnType<typeof createHookManager>
  private packageValidator: PackageValidator
  private gitValidator: GitValidator

  constructor(config: PublisherConfig = {}) {
    this.config = {
      cwd: process.cwd(),
      versionStrategy: 'independent',
      concurrency: 4,
      debug: false,
      logLevel: 'info',
      ...config,
    }

    logger.setLevel(this.config.logLevel!)

    this.registryManager = createRegistryManager({
      cwd: this.config.cwd,
      registries: this.config.registries,
      defaultRegistry: this.config.defaultRegistry,
    })

    this.versionManager = createVersionManager({ cwd: this.config.cwd })
    this.dependencyResolver = createDependencyResolver({ cwd: this.config.cwd })
    this.changelogGenerator = createChangelogGenerator({
      cwd: this.config.cwd,
      options: this.config.changelog,
    })

    this.hookManager = createHookManager(this.config.hooks || {}, this.config.cwd)

    this.packageValidator = new PackageValidator(this.config.validation)
    this.gitValidator = new GitValidator({
      cwd: this.config.cwd,
      requireCleanWorkingDirectory: this.config.validation?.requireCleanWorkingDirectory,
      allowedBranches: this.config.validation?.allowedBranches,
    })
  }

  /**
   * 发布包（单包或 Monorepo）
   * 
   * 完整的发布流程，包括：
   * 1. 初始化和验证
   * 2. 构建
   * 3. 版本更新
   * 4. Changelog 生成
   * 5. 发布到 registry
   * 6. Git 操作
   * 
   * 在每个关键步骤前后会执行相应的生命周期钩子
   * 
   * @returns 发布报告
   * @throws {PublishErr} 当发布失败时
   */
  async publish(): Promise<PublishReport> {
    const startTime = Date.now()
    const context: PublishContext = {
      cwd: this.config.cwd!,
      packages: [],
      publishStatus: new Map(),
      startTime,
      dryRun: this.config.publish?.dryRun || false,
      errors: [],
      warnings: [],
    }

    try {
      // 执行 prePublish 钩子
      await this.hookManager.executeHook('prePublish')

      // 1. 初始化
      await this.initialize(context)

      // 2. 验证
      await this.hookManager.executeHook('preValidate')
      await this.validate(context)
      await this.hookManager.executeHook('postValidate', { valid: true })

      // 3. 构建
      if (!this.config.publish?.skipBuild) {
        await this.build(context)
      }

      // 4. 更新版本
      await this.hookManager.executeHook('preVersion')
      await this.updateVersions(context)
      await this.hookManager.executeHook('postVersion', { packages: context.packages })

      // 5. 生成 Changelog
      if (this.config.changelog?.enabled) {
        await this.hookManager.executeHook('preChangelog')
        await this.generateChangelog(context)
        await this.hookManager.executeHook('postChangelog', { changelog: context.changelog })
      }

      // 6. 发布到 registry
      await this.publishToRegistry(context)

      // 7. Git 操作
      if (this.config.git?.createTag || this.config.git?.createCommit) {
        await this.gitOperations(context)
      }

      // 8. 生成报告
      const report = this.generateReport(context)

      // 9. 记录统计数据
      if (!context.dryRun) {
        const analytics = createPublishAnalytics(this.config.cwd)
        await analytics.recordPublish(report).catch((error: any) => {
          logger.debug(`记录统计数据失败: ${error.message}`)
        })
      }

      // 10. 执行 postPublish 钩子
      await this.hookManager.executeHook('postPublish', report)

      return report
    } catch (error: any) {
      logger.error(`发布失败: ${error.message}`)
      context.errors.push({
        code: 'PUBLISH_FAILED',
        message: error.message,
        fatal: true,
      })
      throw error
    }
  }

  /**
   * 初始化
   */
  private async initialize(context: PublishContext): Promise<void> {
    logger.info('初始化发布流程...')

    // 初始化依赖解析器
    await this.dependencyResolver.initialize()

    // 获取要发布的包
    const packages = this.dependencyResolver.getPackagesToPublish({
      filter: this.config.monorepo?.filter,
      ignorePrivate: this.config.monorepo?.ignorePrivate,
    })

    if (packages.length === 0) {
      throw new PublishErr('未找到要发布的包', {}, '请检查过滤条件和包配置')
    }

    context.packages = packages
    logger.info(`找到 ${packages.length} 个包待发布`)

    // 初始化发布状态
    for (const pkg of packages) {
      context.publishStatus.set(pkg.name, {
        name: pkg.name,
        version: pkg.version,
        status: 'pending',
      })
    }
  }

  /**
   * 验证
   */
  private async validate(context: PublishContext): Promise<void> {
    logger.info('验证包...')

    // Git 验证
    if (!this.config.publish?.skipGitCheck) {
      const gitResult = await this.gitValidator.validate()
      if (!gitResult.valid) {
        throw new PublishErr(
          'Git 验证失败',
          { errors: gitResult.errors },
          '请修复 Git 相关问题后重试'
        )
      }
    }

    // 包验证
    for (const pkg of context.packages) {
      const result = await this.packageValidator.validate(pkg)
      if (!result.valid) {
        throw new PublishErr(
          `包 ${pkg.name} 验证失败`,
          { errors: result.errors },
          '请修复包相关问题后重试'
        )
      }
    }

    logger.success('验证通过')
  }

  /**
   * 构建包
   * 
   * 使用 BuilderIntegration 构建所有包
   * 支持并行构建和构建验证
   * 
   * @param context - 发布上下文
   * @throws {PublishErr} 当构建失败时
   */
  private async build(context: PublishContext): Promise<void> {
    logger.info('构建包...')

    const { createBuilderIntegration } = await import('../integrations/builder-integration.js')
    const builder = createBuilderIntegration({
      cwd: this.config.cwd,
      skipBuild: this.config.publish?.skipBuild,
    })

    try {
      // 根据配置决定是并行还是串行构建
      if (this.config.publish?.parallel && context.packages.length > 1) {
        // 并行构建（独立包）
        logger.info(`并行构建 ${context.packages.length} 个包...`)
        const buildPromises = context.packages.map(pkg =>
          builder.build(pkg).catch(error => {
            context.errors.push({
              package: pkg.name,
              code: 'BUILD_FAILED',
              message: `构建失败: ${error.message}`,
              fatal: false,
            })
            return Promise.reject(error)
          })
        )

        await Promise.allSettled(buildPromises)
      } else {
        // 串行构建
        for (const pkg of context.packages) {
          try {
            await builder.build(pkg)
          } catch (error: any) {
            context.errors.push({
              package: pkg.name,
              code: 'BUILD_FAILED',
              message: `构建失败: ${error.message}`,
              fatal: false,
            })
            throw error
          }
        }
      }

      // 验证构建产物
      for (const pkg of context.packages) {
        const isValid = await builder.validateBuild(pkg)
        if (!isValid && this.config.validation?.requireBuild) {
          throw new PublishErr(
            `包 ${pkg.name} 构建产物验证失败`,
            { package: pkg.name },
            '请检查构建配置是否正确'
          )
        }
      }

      logger.success('所有包构建完成')
    } catch (error: any) {
      throw new PublishErr(
        `构建失败: ${error.message}`,
        { error: error.message },
        '请检查构建脚本和配置'
      )
    }
  }

  /**
   * 更新版本
   */
  private async updateVersions(context: PublishContext): Promise<void> {
    logger.info('更新版本...')

    for (const pkg of context.packages) {
      const versionManager = createVersionManager({
        cwd: pkg.path,
      })

      // 这里简化处理，实际应根据配置决定版本号
      const currentVersion = await versionManager.getCurrentVersion()
      logger.info(`${pkg.name}: ${currentVersion}`)
    }
  }

  /**
   * 生成 Changelog
   */
  private async generateChangelog(context: PublishContext): Promise<void> {
    logger.info('生成 Changelog...')

    for (const pkg of context.packages) {
      const generator = createChangelogGenerator({
        cwd: pkg.path,
        packageName: pkg.name,
        options: this.config.changelog,
      })

      await generator.generateAndWrite(pkg.version)
    }
  }

  /**
   * 发布到 Registry
   */
  private async publishToRegistry(context: PublishContext): Promise<void> {
    logger.info('发布包到 Registry...')

    if (context.dryRun) {
      logger.warn('Dry-run 模式，跳过实际发布')
      return
    }

    for (const pkg of context.packages) {
      const status = context.publishStatus.get(pkg.name)!
      status.status = 'publishing'

      try {
        const registry = this.registryManager.selectRegistryForPackage(pkg.name)
        const client = createNpmClient({
          cwd: pkg.path,
          registry: registry.url,
          token: registry.token,
          tag: this.config.publish?.tag,
          otp: this.config.publish?.otp as string,
        })

        await client.publish()

        status.status = 'published'
        status.registry = registry.url
        logger.success(`✓ ${pkg.name}@${pkg.version}`)
      } catch (error: any) {
        status.status = 'failed'
        status.error = error
        logger.error(`✗ ${pkg.name}: ${error.message}`)
      }
    }
  }

  /**
   * Git 操作
   * 
   * 创建 Git tag 和 commit，并推送到远程仓库
   * 
   * @param context - 发布上下文
   * @throws {PublishErr} 当 Git 操作失败时
   */
  private async gitOperations(context: PublishContext): Promise<void> {
    if (!this.config.git) {
      return
    }

    logger.info('执行 Git 操作...')
    const { createGitUtils } = await import('../utils/git-utils.js')
    const gitUtils = createGitUtils({ cwd: this.config.cwd })

    try {
      const publishedPackages = Array.from(context.publishStatus.values())
        .filter(status => status.status === 'published')

      if (publishedPackages.length === 0) {
        logger.warn('没有成功发布的包，跳过 Git 操作')
        return
      }

      // 1. 创建 commit
      if (this.config.git.createCommit) {
        logger.info('创建 Git commit...')

        // 收集需要提交的文件
        const filesToCommit = this.config.git.commitFiles || [
          'package.json',
          '**/package.json',
          'CHANGELOG.md',
          '**/CHANGELOG.md',
          'pnpm-lock.yaml',
          'package-lock.json',
          'yarn.lock',
        ]

        // 格式化 commit 消息
        let commitMessage = this.config.git.commitMessage || 'chore(release): publish {version}'

        if (this.config.versionStrategy === 'fixed') {
          // 固定版本策略，使用单一版本号
          const firstPackage = publishedPackages[0]
          commitMessage = commitMessage.replace('{version}', firstPackage.version)
        } else {
          // 独立版本策略，列出所有包
          const packageList = publishedPackages
            .map(p => `${p.name}@${p.version}`)
            .join(', ')
          commitMessage = commitMessage.replace('{version}', packageList)
        }

        await gitUtils.commit(
          commitMessage,
          filesToCommit,
          this.config.git.signCommit
        )
      }

      // 2. 创建 tags
      if (this.config.git.createTag) {
        logger.info('创建 Git tags...')

        for (const pkg of publishedPackages) {
          const tagPrefix = this.config.git.tagPrefix || 'v'
          const tagName = this.config.versionStrategy === 'fixed'
            ? `${tagPrefix}${pkg.version}`
            : `${pkg.name}@${pkg.version}`

          const tagMessage = this.config.git.tagMessage ||
            `Release ${pkg.name} ${pkg.version}`

          // 检查 tag 是否已存在
          const tagExists = await gitUtils.tagExists(tagName)
          if (tagExists) {
            logger.warn(`Tag ${tagName} 已存在，跳过创建`)
            continue
          }

          await gitUtils.createTag(
            tagName,
            tagMessage,
            this.config.git.signTag
          )
        }
      }

      // 3. 推送 commit
      if (this.config.git.pushCommit && this.config.git.createCommit) {
        logger.info('推送 commit 到远程仓库...')
        const remote = this.config.git.remote || 'origin'
        const branch = await gitUtils.getCurrentBranch()
        await gitUtils.push(remote, branch)
      }

      // 4. 推送 tags
      if (this.config.git.pushTag && this.config.git.createTag) {
        logger.info('推送 tags 到远程仓库...')
        const remote = this.config.git.remote || 'origin'

        for (const pkg of publishedPackages) {
          const tagPrefix = this.config.git.tagPrefix || 'v'
          const tagName = this.config.versionStrategy === 'fixed'
            ? `${tagPrefix}${pkg.version}`
            : `${pkg.name}@${pkg.version}`

          const tagExists = await gitUtils.tagExists(tagName)
          if (tagExists) {
            await gitUtils.pushTag(tagName, remote)
          }
        }
      }

      logger.success('Git 操作完成')
    } catch (error: any) {
      throw new PublishErr(
        `Git 操作失败: ${error.message}`,
        { error: error.message },
        '请检查 Git 配置和权限'
      )
    }
  }

  /**
   * 生成报告
   */
  private generateReport(context: PublishContext): PublishReport {
    const published = []
    const failed = []
    const skipped = []

    for (const [name, status] of context.publishStatus) {
      if (status.status === 'published') {
        published.push({
          name,
          version: status.version,
          success: true,
          registry: status.registry!,
        })
      } else if (status.status === 'failed') {
        failed.push({
          name,
          version: status.version,
          success: false,
          registry: status.registry || '',
          error: status.error?.message,
        })
      } else if (status.status === 'skipped') {
        skipped.push(name)
      }
    }

    const duration = Date.now() - context.startTime

    return {
      success: failed.length === 0,
      published,
      failed,
      skipped,
      duration,
      errors: context.errors,
      warnings: context.warnings,
      summary: this.generateSummary(published, failed, skipped),
    }
  }

  /**
   * 生成摘要
   */
  private generateSummary(published: any[], failed: any[], skipped: string[]): string {
    return `
发布完成！
✓ 成功: ${published.length}
✗ 失败: ${failed.length}
○ 跳过: ${skipped.length}
    `.trim()
  }
}

/**
 * 创建发布管理器实例
 */
export function createPublishManager(config: PublisherConfig = {}): PublishManager {
  return new PublishManager(config)
}

