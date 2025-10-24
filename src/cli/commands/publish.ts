/**
 * Publish 命令
 */

import { Command } from 'commander'
import { createPublishManager } from '../../core/PublishManager.js'
import { logger } from '../../utils/logger.js'
import type { PublisherConfig } from '../../types/index.js'

export function createPublishCommand(): Command {
  const command = new Command('publish')

  command
    .description('发布包到 NPM Registry')
    .option('--dry-run', '模拟发布，不实际执行')
    .option('--skip-build', '跳过构建步骤')
    .option('--skip-tests', '跳过测试')
    .option('--skip-git-check', '跳过 Git 检查')
    .option('--tag <tag>', '发布 tag (如 latest, beta)', 'latest')
    .option('--registry <registry>', 'Registry 名称或 URL')
    .option('--otp <code>', '2FA OTP 代码')
    .option('--force', '强制发布')
    .option('--filter <packages...>', '过滤要发布的包')
    .option('--concurrency <n>', '并发数', '4')
    .action(async (options) => {
      try {
        const config: PublisherConfig = {
          publish: {
            dryRun: options.dryRun,
            skipBuild: options.skipBuild,
            skipTests: options.skipTests,
            skipGitCheck: options.skipGitCheck,
            tag: options.tag,
            otp: options.otp,
            force: options.force,
            registry: options.registry,
          },
          monorepo: {
            filter: options.filter,
          },
          concurrency: parseInt(options.concurrency, 10),
        }

        const manager = createPublishManager(config)
        const report = await manager.publish()

        // 显示报告
        logger.title('发布报告')
        logger.log(report.summary)

        if (report.published.length > 0) {
          logger.log('\n成功发布:')
          for (const pkg of report.published) {
            logger.success(`  ${pkg.name}@${pkg.version}`)
          }
        }

        if (report.failed.length > 0) {
          logger.log('\n发布失败:')
          for (const pkg of report.failed) {
            logger.error(`  ${pkg.name}@${pkg.version}: ${pkg.error}`)
          }
        }

        process.exit(report.success ? 0 : 1)
      } catch (error: any) {
        logger.error(`发布失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

