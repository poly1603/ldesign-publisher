/**
 * Version 命令
 */

import { Command } from 'commander'
import { createVersionManager } from '../../core/VersionManager.js'
import { logger } from '../../utils/logger.js'
import type { VersionBumpType } from '../../types/index.js'

export function createVersionCommand(): Command {
  const command = new Command('version')

  command
    .description('管理包版本')
    .argument('[type]', '版本类型 (major|minor|patch|prerelease)')
    .option('--preid <identifier>', '预发布标识符 (alpha|beta|rc)')
    .option('--exact <version>', '指定精确版本号')
    .option('--recommend', '获取推荐版本')
    .action(async (type: string, options) => {
      try {
        const versionManager = createVersionManager()

        if (options.recommend) {
          const recommendation = await versionManager.getRecommendedVersion()
          logger.info(`推荐版本: ${recommendation.version}`)
          logger.info(`推荐类型: ${recommendation.releaseType}`)
          logger.info(`推荐原因: ${recommendation.reason}`)
          return
        }

        const updateOptions: any = {}

        if (options.exact) {
          updateOptions.version = options.exact
        } else if (type) {
          updateOptions.type = type as VersionBumpType
          updateOptions.preid = options.preid
        } else {
          // 显示当前版本
          const currentVersion = await versionManager.getCurrentVersion()
          logger.info(`当前版本: ${currentVersion}`)
          return
        }

        const versionInfo = await versionManager.updateVersion(updateOptions)
        logger.success(`版本已更新: ${versionInfo.version} -> ${versionInfo.newVersion}`)
      } catch (error: any) {
        logger.error(`版本更新失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

