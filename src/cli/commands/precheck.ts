/**
 * Precheck 命令 - 发布前预检查
 * 
 * 在实际发布前检查所有必要条件，预览将要发布的包，
 * 并提供详细的检查报告
 */

import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { createPublishManager } from '../../core/PublishManager.js'
import { createDependencyResolver } from '../../core/DependencyResolver.js'
import { GitValidator } from '../../validators/git-validator.js'
import { PackageValidator } from '../../validators/package-validator.js'
import { createConfigValidator } from '../../validators/config-validator.js'
import { logger } from '../../utils/logger.js'
import type { PublisherConfig } from '../../types/index.js'

/**
 * 预检查结果
 */
interface PrecheckResult {
  /** 是否通过 */
  passed: boolean
  /** 检查项结果 */
  checks: CheckItem[]
  /** 将要发布的包 */
  packagesToPublish: Array<{
    name: string
    currentVersion: string
    newVersion: string
  }>
  /** 总计检查项 */
  totalChecks: number
  /** 通过的检查项 */
  passedChecks: number
  /** 警告数量 */
  warnings: number
  /** 错误数量 */
  errors: number
}

/**
 * 检查项
 */
interface CheckItem {
  /** 检查名称 */
  name: string
  /** 检查描述 */
  description: string
  /** 检查状态 */
  status: 'pass' | 'warn' | 'fail' | 'skip'
  /** 详细信息 */
  details?: string
  /** 建议 */
  suggestion?: string
}

/**
 * 创建 precheck 命令
 */
export function createPrecheckCommand(): Command {
  const command = new Command('precheck')

  command
    .description('🔍 发布前预检查 - 验证所有发布条件')
    .option('--config <path>', '配置文件路径')
    .option('--filter <packages...>', '过滤要检查的包')
    .option('--strict', '严格模式，任何警告都会导致失败')
    .option('--json', '以 JSON 格式输出结果')
    .action(async (options) => {
      try {
        logger.title('发布前预检查')

        const config: PublisherConfig = {
          cwd: process.cwd(),
          monorepo: {
            filter: options.filter,
          },
        }

        const result = await performPrecheck(config, options.strict)

        if (options.json) {
          console.log(JSON.stringify(result, null, 2))
        } else {
          displayPrecheckResult(result)
        }

        process.exit(result.passed ? 0 : 1)
      } catch (error: any) {
        logger.error(`预检查失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

/**
 * 执行预检查
 */
async function performPrecheck(
  config: PublisherConfig,
  strict = false
): Promise<PrecheckResult> {
  const checks: CheckItem[] = []
  const packagesToPublish: PrecheckResult['packagesToPublish'] = []

  // 1. 配置验证
  logger.info('检查配置...')
  const configCheck = await checkConfig(config)
  checks.push(configCheck)

  // 2. Git 状态检查
  logger.info('检查 Git 状态...')
  const gitCheck = await checkGitStatus(config)
  checks.push(gitCheck)

  // 3. 依赖检查
  logger.info('检查依赖关系...')
  const depsCheck = await checkDependencies(config)
  checks.push(depsCheck)

  // 4. 包验证
  logger.info('验证包...')
  const packagesCheck = await checkPackages(config, packagesToPublish)
  checks.push(...packagesCheck)

  // 5. 环境检查
  logger.info('检查环境...')
  const envCheck = await checkEnvironment()
  checks.push(envCheck)

  // 6. 凭证检查
  logger.info('检查 NPM 凭证...')
  const credCheck = await checkNpmCredentials(config)
  checks.push(credCheck)

  // 统计结果
  const passedChecks = checks.filter(c => c.status === 'pass').length
  const warnings = checks.filter(c => c.status === 'warn').length
  const errors = checks.filter(c => c.status === 'fail').length

  const passed = strict ? (errors === 0 && warnings === 0) : (errors === 0)

  return {
    passed,
    checks,
    packagesToPublish,
    totalChecks: checks.length,
    passedChecks,
    warnings,
    errors,
  }
}

/**
 * 检查配置
 */
async function checkConfig(config: PublisherConfig): Promise<CheckItem> {
  try {
    const validator = createConfigValidator()
    const result = validator.validate(config)

    if (!result.valid) {
      return {
        name: '配置验证',
        description: '验证发布配置',
        status: 'fail',
        details: result.errors?.map(e => e.message).join(', '),
        suggestion: '请修复配置错误',
      }
    }

    if (result.warnings && result.warnings.length > 0) {
      return {
        name: '配置验证',
        description: '验证发布配置',
        status: 'warn',
        details: `${result.warnings.length} 个警告`,
      }
    }

    return {
      name: '配置验证',
      description: '验证发布配置',
      status: 'pass',
    }
  } catch (error: any) {
    return {
      name: '配置验证',
      description: '验证发布配置',
      status: 'fail',
      details: error.message,
    }
  }
}

/**
 * 检查 Git 状态
 */
async function checkGitStatus(config: PublisherConfig): Promise<CheckItem> {
  try {
    const validator = new GitValidator({
      cwd: config.cwd,
      requireCleanWorkingDirectory: true,
      allowedBranches: ['main', 'master'],
    })

    const result = await validator.validate()

    if (!result.valid) {
      return {
        name: 'Git 状态',
        description: '检查 Git 工作区和分支',
        status: 'fail',
        details: result.errors?.map(e => e.message).join(', '),
        suggestion: '请确保工作区干净且在正确的分支上',
      }
    }

    return {
      name: 'Git 状态',
      description: '检查 Git 工作区和分支',
      status: 'pass',
    }
  } catch (error: any) {
    return {
      name: 'Git 状态',
      description: '检查 Git 工作区和分支',
      status: 'fail',
      details: error.message,
    }
  }
}

/**
 * 检查依赖关系
 */
async function checkDependencies(config: PublisherConfig): Promise<CheckItem> {
  try {
    const resolver = createDependencyResolver({ cwd: config.cwd })
    await resolver.initialize()

    const validation = await resolver.validate()

    if (!validation.valid) {
      return {
        name: '依赖关系',
        description: '检查包依赖和循环依赖',
        status: 'fail',
        details: validation.errors.join(', '),
        suggestion: '请修复循环依赖或版本冲突',
      }
    }

    if (validation.warnings.length > 0) {
      return {
        name: '依赖关系',
        description: '检查包依赖和循环依赖',
        status: 'warn',
        details: `${validation.warnings.length} 个警告`,
      }
    }

    return {
      name: '依赖关系',
      description: '检查包依赖和循环依赖',
      status: 'pass',
    }
  } catch (error: any) {
    return {
      name: '依赖关系',
      description: '检查包依赖和循环依赖',
      status: 'fail',
      details: error.message,
    }
  }
}

/**
 * 检查包
 */
async function checkPackages(
  config: PublisherConfig,
  packagesToPublish: PrecheckResult['packagesToPublish']
): Promise<CheckItem[]> {
  const checks: CheckItem[] = []

  try {
    const resolver = createDependencyResolver({ cwd: config.cwd })
    await resolver.initialize()

    const packages = resolver.getAllPackages({
      filter: config.monorepo?.filter,
      ignorePrivate: true,
    })

    for (const pkg of packages) {
      packagesToPublish.push({
        name: pkg.name,
        currentVersion: pkg.version,
        newVersion: pkg.version, // 实际应该计算新版本
      })
    }

    const validator = new PackageValidator({
      requiredFiles: ['README.md', 'LICENSE'],
      scanSensitiveData: true,
    })

    for (const pkg of packages) {
      const result = await validator.validate(pkg)

      if (!result.valid) {
        checks.push({
          name: `包验证 - ${pkg.name}`,
          description: '验证包内容和配置',
          status: 'fail',
          details: result.errors?.map(e => e.message).join(', '),
        })
      } else if (result.warnings && result.warnings.length > 0) {
        checks.push({
          name: `包验证 - ${pkg.name}`,
          description: '验证包内容和配置',
          status: 'warn',
          details: `${result.warnings.length} 个警告`,
        })
      } else {
        checks.push({
          name: `包验证 - ${pkg.name}`,
          description: '验证包内容和配置',
          status: 'pass',
        })
      }
    }

    if (checks.length === 0) {
      checks.push({
        name: '包验证',
        description: '验证包内容和配置',
        status: 'warn',
        details: '没有找到要发布的包',
      })
    }
  } catch (error: any) {
    checks.push({
      name: '包验证',
      description: '验证包内容和配置',
      status: 'fail',
      details: error.message,
    })
  }

  return checks
}

/**
 * 检查环境
 */
async function checkEnvironment(): Promise<CheckItem> {
  try {
    const nodeVersion = process.version
    const npmVersion = await getNpmVersion()

    // 检查 Node.js 版本
    const nodeVersionNumber = parseInt(nodeVersion.slice(1))
    if (nodeVersionNumber < 18) {
      return {
        name: '环境检查',
        description: '检查 Node.js 和 NPM 版本',
        status: 'fail',
        details: `Node.js ${nodeVersion} 太旧，需要 >= 18`,
        suggestion: '请升级 Node.js 到 18 或更高版本',
      }
    }

    return {
      name: '环境检查',
      description: '检查 Node.js 和 NPM 版本',
      status: 'pass',
      details: `Node.js ${nodeVersion}, NPM ${npmVersion}`,
    }
  } catch (error: any) {
    return {
      name: '环境检查',
      description: '检查 Node.js 和 NPM 版本',
      status: 'warn',
      details: error.message,
    }
  }
}

/**
 * 检查 NPM 凭证
 */
async function checkNpmCredentials(config: PublisherConfig): Promise<CheckItem> {
  try {
    const { createNpmClient } = await import('../../utils/npm-client.js')
    const client = createNpmClient({ cwd: config.cwd })

    const username = await client.whoami()

    if (!username) {
      return {
        name: 'NPM 凭证',
        description: '检查 NPM 登录状态',
        status: 'fail',
        details: '未登录到 NPM',
        suggestion: '请运行 npm login',
      }
    }

    return {
      name: 'NPM 凭证',
      description: '检查 NPM 登录状态',
      status: 'pass',
      details: `已登录为 ${username}`,
    }
  } catch (error: any) {
    return {
      name: 'NPM 凭证',
      description: '检查 NPM 登录状态',
      status: 'warn',
      details: '无法检查登录状态',
    }
  }
}

/**
 * 获取 NPM 版本
 */
async function getNpmVersion(): Promise<string> {
  const { execa } = await import('execa')
  try {
    const result = await execa('npm', ['--version'])
    return result.stdout.trim()
  } catch {
    return 'unknown'
  }
}

/**
 * 显示预检查结果
 */
function displayPrecheckResult(result: PrecheckResult): void {
  logger.divider()
  logger.log('')

  // 创建表格
  const table = new Table({
    head: [
      chalk.bold('检查项'),
      chalk.bold('状态'),
      chalk.bold('详情'),
    ],
    colWidths: [30, 10, 60],
    style: {
      head: ['cyan'],
    },
  })

  // 添加检查结果
  for (const check of result.checks) {
    const statusIcon = getStatusIcon(check.status)
    const statusColor = getStatusColor(check.status)

    table.push([
      check.description,
      statusColor(statusIcon),
      check.details || '-',
    ])
  }

  console.log(table.toString())

  // 显示要发布的包
  if (result.packagesToPublish.length > 0) {
    logger.log('')
    logger.info('将要发布的包:')
    for (const pkg of result.packagesToPublish) {
      logger.log(`  • ${chalk.cyan(pkg.name)}: ${pkg.currentVersion} → ${pkg.newVersion}`)
    }
  }

  // 显示统计
  logger.log('')
  logger.log(chalk.bold('检查统计:'))
  logger.log(`  总计: ${result.totalChecks}`)
  logger.log(`  ${chalk.green('✓ 通过')}: ${result.passedChecks}`)
  if (result.warnings > 0) {
    logger.log(`  ${chalk.yellow('⚠ 警告')}: ${result.warnings}`)
  }
  if (result.errors > 0) {
    logger.log(`  ${chalk.red('✗ 错误')}: ${result.errors}`)
  }

  logger.log('')
  if (result.passed) {
    logger.success('✅ 预检查通过！可以开始发布。')
  } else {
    logger.error('❌ 预检查失败！请修复上述问题后重试。')
  }
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: CheckItem['status']): string {
  switch (status) {
    case 'pass':
      return '✓'
    case 'warn':
      return '⚠'
    case 'fail':
      return '✗'
    case 'skip':
      return '○'
  }
}

/**
 * 获取状态颜色函数
 */
function getStatusColor(status: CheckItem['status']): (text: string) => string {
  switch (status) {
    case 'pass':
      return chalk.green
    case 'warn':
      return chalk.yellow
    case 'fail':
      return chalk.red
    case 'skip':
      return chalk.gray
  }
}

