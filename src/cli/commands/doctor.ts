/**
 * Doctor 命令 - 诊断环境和配置
 */

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import { logger } from '../../utils/logger.js'
import { createGitUtils } from '../../utils/git-utils.js'

interface DiagnosticResult {
  category: string
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  suggestion?: string
}

export function createDoctorCommand(): Command {
  const command = new Command('doctor')

  command
    .description('诊断环境和配置')
    .option('--json', '以 JSON 格式输出')
    .option('--verbose', '显示详细信息')
    .action(async (options) => {
      try {
        await handleDoctor(options)
      } catch (error: any) {
        logger.error(`诊断失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

async function handleDoctor(options: any): Promise<void> {
  logger.info('🩺 开始环境诊断...\n')

  const results: DiagnosticResult[] = []

  // 1. 检查 Node.js 版本
  results.push(await checkNodeVersion())

  // 2. 检查包管理器
  results.push(await checkPackageManager())

  // 3. 检查 Git
  results.push(await checkGit())

  // 4. 检查配置文件
  results.push(await checkConfigFile())

  // 5. 检查 package.json
  results.push(await checkPackageJson())

  // 6. 检查 NPM 认证
  results.push(await checkNpmAuth())

  // 7. 检查工作区状态
  results.push(await checkWorkingDirectory())

  // 8. 检查依赖
  results.push(await checkDependencies())

  // 输出结果
  if (options.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    printResults(results, options.verbose)
  }

  // 检查是否有错误
  const hasErrors = results.some((r) => r.status === 'fail')
  const hasWarnings = results.some((r) => r.status === 'warn')

  console.log()
  if (hasErrors) {
    logger.error('❌ 发现问题，请根据上述建议修复')
    process.exit(1)
  } else if (hasWarnings) {
    logger.warn('⚠️  发现警告，建议检查')
  } else {
    logger.success('✅ 所有检查通过，环境正常')
  }
}

/**
 * 检查 Node.js 版本
 */
async function checkNodeVersion(): Promise<DiagnosticResult> {
  const version = process.version
  const majorVersion = parseInt(version.slice(1).split('.')[0])

  if (majorVersion >= 18) {
    return {
      category: '环境',
      name: 'Node.js 版本',
      status: 'pass',
      message: `${version} ✓`,
    }
  } else {
    return {
      category: '环境',
      name: 'Node.js 版本',
      status: 'fail',
      message: `${version} (需要 >= 18.0.0)`,
      suggestion: '请升级 Node.js 到 18.0.0 或更高版本',
    }
  }
}

/**
 * 检查包管理器
 */
async function checkPackageManager(): Promise<DiagnosticResult> {
  try {
    const version = execSync('pnpm --version', { encoding: 'utf-8' }).trim()
    return {
      category: '环境',
      name: 'pnpm',
      status: 'pass',
      message: `${version} ✓`,
    }
  } catch {
    return {
      category: '环境',
      name: 'pnpm',
      status: 'warn',
      message: '未安装',
      suggestion: '推荐使用 pnpm，运行: npm install -g pnpm',
    }
  }
}

/**
 * 检查 Git
 */
async function checkGit(): Promise<DiagnosticResult> {
  try {
    const gitUtils = createGitUtils()
    const isRepo = await gitUtils.isGitRepository()

    if (!isRepo) {
      return {
        category: 'Git',
        name: 'Git 仓库',
        status: 'fail',
        message: '当前目录不是 Git 仓库',
        suggestion: '运行 git init 初始化仓库',
      }
    }

    const version = execSync('git --version', { encoding: 'utf-8' }).trim()
    return {
      category: 'Git',
      name: 'Git',
      status: 'pass',
      message: `${version} ✓`,
    }
  } catch {
    return {
      category: 'Git',
      name: 'Git',
      status: 'fail',
      message: '未安装',
      suggestion: '请安装 Git',
    }
  }
}

/**
 * 检查配置文件
 */
async function checkConfigFile(): Promise<DiagnosticResult> {
  const configFiles = [
    'publisher.config.ts',
    'publisher.config.js',
    'publisher.config.mjs',
    'publisher.config.json',
  ]

  const existingConfig = configFiles.find((file) =>
    existsSync(resolve(process.cwd(), file))
  )

  if (existingConfig) {
    return {
      category: '配置',
      name: '配置文件',
      status: 'pass',
      message: `${existingConfig} ✓`,
    }
  } else {
    return {
      category: '配置',
      name: '配置文件',
      status: 'warn',
      message: '未找到配置文件',
      suggestion: '运行 ldesign-publisher init 创建配置文件',
    }
  }
}

/**
 * 检查 package.json
 */
async function checkPackageJson(): Promise<DiagnosticResult> {
  const packageJsonPath = resolve(process.cwd(), 'package.json')

  if (!existsSync(packageJsonPath)) {
    return {
      category: '项目',
      name: 'package.json',
      status: 'fail',
      message: '未找到',
      suggestion: '运行 npm init 创建 package.json',
    }
  }

  try {
    const pkg = require(packageJsonPath)

    if (!pkg.name) {
      return {
        category: '项目',
        name: 'package.json',
        status: 'warn',
        message: '缺少 name 字段',
        suggestion: '添加 name 字段到 package.json',
      }
    }

    if (!pkg.version) {
      return {
        category: '项目',
        name: 'package.json',
        status: 'warn',
        message: '缺少 version 字段',
        suggestion: '添加 version 字段到 package.json',
      }
    }

    return {
      category: '项目',
      name: 'package.json',
      status: 'pass',
      message: `${pkg.name}@${pkg.version} ✓`,
    }
  } catch {
    return {
      category: '项目',
      name: 'package.json',
      status: 'fail',
      message: '格式错误',
      suggestion: '检查 package.json 格式是否正确',
    }
  }
}

/**
 * 检查 NPM 认证
 */
async function checkNpmAuth(): Promise<DiagnosticResult> {
  try {
    execSync('npm whoami', { encoding: 'utf-8', stdio: 'pipe' })
    return {
      category: 'NPM',
      name: 'NPM 认证',
      status: 'pass',
      message: '已登录 ✓',
    }
  } catch {
    return {
      category: 'NPM',
      name: 'NPM 认证',
      status: 'warn',
      message: '未登录',
      suggestion: '运行 npm login 登录 NPM',
    }
  }
}

/**
 * 检查工作区状态
 */
async function checkWorkingDirectory(): Promise<DiagnosticResult> {
  try {
    const gitUtils = createGitUtils()
    const isClean = await gitUtils.isWorkingDirectoryClean()

    if (isClean) {
      return {
        category: 'Git',
        name: '工作区状态',
        status: 'pass',
        message: '干净 ✓',
      }
    } else {
      return {
        category: 'Git',
        name: '工作区状态',
        status: 'warn',
        message: '有未提交的更改',
        suggestion: '提交或暂存更改: git commit -a',
      }
    }
  } catch {
    return {
      category: 'Git',
      name: '工作区状态',
      status: 'fail',
      message: '检查失败',
    }
  }
}

/**
 * 检查依赖
 */
async function checkDependencies(): Promise<DiagnosticResult> {
  const nodeModulesPath = resolve(process.cwd(), 'node_modules')

  if (!existsSync(nodeModulesPath)) {
    return {
      category: '项目',
      name: '依赖安装',
      status: 'warn',
      message: 'node_modules 不存在',
      suggestion: '运行 pnpm install 安装依赖',
    }
  }

  return {
    category: '项目',
    name: '依赖安装',
    status: 'pass',
    message: '已安装 ✓',
  }
}

/**
 * 打印结果
 */
function printResults(results: DiagnosticResult[], verbose: boolean): void {
  const table = new Table({
    head: ['类别', '检查项', '状态', '结果'],
    colWidths: [12, 20, 10, 50],
    style: { head: ['cyan'] },
  })

  for (const result of results) {
    const statusIcon = getStatusIcon(result.status)
    const statusText = getStatusText(result.status)

    table.push([
      result.category,
      result.name,
      statusIcon + ' ' + statusText,
      result.message,
    ])

    if (verbose && result.suggestion) {
      table.push(['', '', '', chalk.yellow(`💡 ${result.suggestion}`)],)
    }
  }

  console.log(table.toString())

  // 如果有建议且不是 verbose 模式，单独显示
  if (!verbose) {
    const withSuggestions = results.filter((r) => r.suggestion)
    if (withSuggestions.length > 0) {
      console.log('\n' + chalk.bold('💡 修复建议:'))
      withSuggestions.forEach((result) => {
        console.log(`  ${chalk.yellow('•')} ${result.name}: ${result.suggestion}`)
      })
    }
  }
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return chalk.green('✓')
    case 'warn':
      return chalk.yellow('⚠')
    case 'fail':
      return chalk.red('✗')
  }
}

/**
 * 获取状态文本
 */
function getStatusText(status: 'pass' | 'warn' | 'fail'): string {
  switch (status) {
    case 'pass':
      return chalk.green('通过')
    case 'warn':
      return chalk.yellow('警告')
    case 'fail':
      return chalk.red('失败')
  }
}
