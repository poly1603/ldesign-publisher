/**
 * CLI 入口
 */

import { Command } from 'commander'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createPublishCommand } from './commands/publish.js'
import { createVersionCommand } from './commands/version.js'
import { createChangelogCommand } from './commands/changelog.js'
import { createRollbackCommand } from './commands/rollback.js'
import { createPrecheckCommand } from './commands/precheck.js'
import { createStatsCommand } from './commands/stats.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function getVersion(): Promise<string> {
  try {
    const packageJson = await readFile(
      join(__dirname, '../../package.json'),
      'utf-8'
    )
    return JSON.parse(packageJson).version
  } catch {
    return '1.0.0'
  }
}

export async function createCLI(): Promise<Command> {
  const version = await getVersion()

  const program = new Command()

  program
    .name('ldesign-publisher')
    .description('🚀 功能强大的 NPM 发布管理工具')
    .version(version)

  // 添加命令
  program.addCommand(createPublishCommand())
  program.addCommand(createVersionCommand())
  program.addCommand(createChangelogCommand())
  program.addCommand(createRollbackCommand())
  program.addCommand(createPrecheckCommand())
  program.addCommand(createStatsCommand())

  return program
}

// CLI 执行
export async function runCLI(): Promise<void> {
  const program = await createCLI()
  await program.parseAsync(process.argv)
}

// 如果直接运行
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI().catch((error) => {
    console.error('CLI 执行失败:', error)
    process.exit(1)
  })
}

