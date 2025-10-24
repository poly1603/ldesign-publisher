/**
 * Rollback 命令
 */

import { Command } from 'commander'
import { createRollbackManager } from '../../core/RollbackManager.js'
import { logger } from '../../utils/logger.js'
import inquirer from 'inquirer'

export function createRollbackCommand(): Command {
  const command = new Command('rollback')

  command
    .description('回滚已发布的包')
    .argument('<package>', '包名')
    .option('--version <version>', '要回滚的版本')
    .option('--unpublish', '使用 unpublish (24小时内)')
    .option('--deprecate', '使用 deprecate 标记废弃')
    .option('--delete-tag', '删除 Git tag')
    .option('--revert-git', '恢复 Git 提交')
    .option('--reason <reason>', '回滚原因')
    .option('--yes', '跳过确认')
    .action(async (packageName: string, options) => {
      try {
        // 确认操作
        if (!options.yes) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: `确定要回滚 ${packageName}${options.version ? `@${options.version}` : ''} 吗？`,
              default: false,
            },
          ])

          if (!confirm) {
            logger.info('已取消回滚')
            return
          }
        }

        const manager = createRollbackManager()
        const record = await manager.rollback(packageName, {
          version: options.version,
          unpublish: options.unpublish,
          deprecate: options.deprecate,
          deleteTag: options.deleteTag,
          revertGit: options.revertGit,
          reason: options.reason,
        })

        if (record.success) {
          logger.success('回滚成功')
        } else {
          logger.error('回滚失败')
          process.exit(1)
        }
      } catch (error: any) {
        logger.error(`回滚失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

