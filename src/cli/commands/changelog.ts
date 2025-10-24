/**
 * Changelog 命令
 */

import { Command } from 'commander'
import { createChangelogGenerator } from '../../core/ChangelogGenerator.js'
import { createVersionManager } from '../../core/VersionManager.js'
import { logger } from '../../utils/logger.js'

export function createChangelogCommand(): Command {
  const command = new Command('changelog')

  command
    .description('生成 Changelog')
    .option('--from <tag>', '起始 tag')
    .option('--to <tag>', '结束 tag', 'HEAD')
    .option('--output <file>', '输出文件', 'CHANGELOG.md')
    .action(async (options) => {
      try {
        const versionManager = createVersionManager()
        const version = await versionManager.getCurrentVersion()

        const generator = createChangelogGenerator({
          options: {
            output: options.output,
          },
        })

        await generator.generateAndWrite(version, options.from, options.to)
        logger.success(`Changelog 已生成: ${options.output}`)
      } catch (error: any) {
        logger.error(`生成 Changelog 失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

