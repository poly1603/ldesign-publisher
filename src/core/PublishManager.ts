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

    this.packageValidator = new PackageValidator(this.config.validation)
    this.gitValidator = new GitValidator({
      cwd: this.config.cwd,
      requireCleanWorkingDirectory: this.config.validation?.requireCleanWorkingDirectory,
      allowedBranches: this.config.validation?.allowedBranches,
    })
  }

  /**
   * 发布包（单包或 Monorepo）
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
      // 1. 初始化
      await this.initialize(context)

      // 2. 验证
      await this.validate(context)

      // 3. 构建
      if (!this.config.publish?.skipBuild) {
        await this.build(context)
      }

      // 4. 更新版本
      await this.updateVersions(context)

      // 5. 生成 Changelog
      if (this.config.changelog?.enabled) {
        await this.generateChangelog(context)
      }

      // 6. 发布到 registry
      await this.publishToRegistry(context)

      // 7. Git 操作
      if (this.config.git?.createTag || this.config.git?.createCommit) {
        await this.gitOperations(context)
      }

      // 8. 生成报告
      return this.generateReport(context)
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
   * 构建
   */
  private async build(context: PublishContext): Promise<void> {
    logger.info('构建包...')
    // 此处将集成 @ldesign/builder
    logger.info('构建功能将在后续实现')
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
   */
  private async gitOperations(context: PublishContext): Promise<void> {
    logger.info('执行 Git 操作...')
    // Git tag 和 commit 操作
    logger.info('Git 操作将在后续实现')
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

