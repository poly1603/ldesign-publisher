/**
 * Stats 命令 - 查看发布统计
 * 
 * 显示发布历史、成功率、耗时等统计信息
 */

import { Command } from 'commander'
import chalk from 'chalk'
import Table from 'cli-table3'
import prettyMs from 'pretty-ms'
import { createPublishAnalytics } from '../../core/PublishAnalytics.js'
import { logger } from '../../utils/logger.js'

/**
 * 创建 stats 命令
 */
export function createStatsCommand(): Command {
  const command = new Command('stats')

  command
    .description('📊 查看发布统计信息')
    .option('--recent <count>', '显示最近的发布记录数量', '10')
    .option('--json', '以 JSON 格式输出')
    .option('--clear', '清除所有统计数据')
    .action(async (options) => {
      try {
        const analytics = createPublishAnalytics()

        if (options.clear) {
          await analytics.clearRecords()
          logger.success('统计数据已清除')
          return
        }

        const stats = await analytics.getStatistics()

        if (options.json) {
          console.log(JSON.stringify(stats, null, 2))
          return
        }

        displayStatistics(stats)

        // 显示最近的发布记录
        const recentCount = parseInt(options.recent, 10)
        if (recentCount > 0) {
          const recent = await analytics.getRecentPublishes(recentCount)
          if (recent.length > 0) {
            logger.log('')
            displayRecentPublishes(recent)
          }
        }
      } catch (error: any) {
        logger.error(`获取统计信息失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

/**
 * 显示统计信息
 */
function displayStatistics(stats: any): void {
  logger.title('发布统计')

  // 总体统计
  const overviewTable = new Table({
    head: [chalk.bold('指标'), chalk.bold('数值')],
    colWidths: [30, 30],
  })

  overviewTable.push(
    ['总发布次数', chalk.cyan(stats.totalPublishes.toString())],
    ['成功次数', chalk.green(stats.successfulPublishes.toString())],
    ['失败次数', chalk.red(stats.failedPublishes.toString())],
    ['成功率', getSuccessRateColor(stats.successRate)(`${stats.successRate}%`)],
    ['平均耗时', chalk.yellow(prettyMs(stats.averageDuration))],
    ['总发布包数', chalk.cyan(stats.totalPackages.toString())]
  )

  console.log(overviewTable.toString())

  // 最近一次发布
  if (stats.lastPublish) {
    logger.log('')
    logger.info('最近一次发布:')
    const lastPublish = stats.lastPublish
    logger.log(`  时间: ${chalk.cyan(new Date(lastPublish.timestamp).toLocaleString())}`)
    logger.log(`  包数: ${chalk.cyan(lastPublish.packageCount)}`)
    logger.log(`  状态: ${lastPublish.success ? chalk.green('✓ 成功') : chalk.red('✗ 失败')}`)
    logger.log(`  耗时: ${chalk.yellow(prettyMs(lastPublish.duration))}`)
  }

  // 性能统计
  if (stats.fastestPublish && stats.slowestPublish) {
    logger.log('')
    logger.info('性能统计:')
    logger.log(`  最快: ${chalk.green(prettyMs(stats.fastestPublish.duration))} (${stats.fastestPublish.packageCount} 个包)`)
    logger.log(`  最慢: ${chalk.red(prettyMs(stats.slowestPublish.duration))} (${stats.slowestPublish.packageCount} 个包)`)
  }

  // 按月统计
  if (stats.byMonth && Object.keys(stats.byMonth).length > 0) {
    logger.log('')
    logger.info('按月统计 (最近6个月):')

    const monthTable = new Table({
      head: [chalk.bold('月份'), chalk.bold('发布次数')],
      colWidths: [15, 15],
    })

    const months = Object.keys(stats.byMonth).sort().reverse().slice(0, 6)
    for (const month of months) {
      monthTable.push([month, chalk.cyan(stats.byMonth[month].toString())])
    }

    console.log(monthTable.toString())
  }
}

/**
 * 显示最近的发布记录
 */
function displayRecentPublishes(records: any[]): void {
  logger.info(`最近 ${records.length} 次发布:`)

  const table = new Table({
    head: [
      chalk.bold('时间'),
      chalk.bold('包数'),
      chalk.bold('状态'),
      chalk.bold('耗时'),
    ],
    colWidths: [25, 10, 10, 15],
  })

  for (const record of records) {
    table.push([
      new Date(record.timestamp).toLocaleString(),
      chalk.cyan(record.packageCount.toString()),
      record.success ? chalk.green('✓') : chalk.red('✗'),
      chalk.yellow(prettyMs(record.duration)),
    ])
  }

  console.log(table.toString())
}

/**
 * 获取成功率颜色
 */
function getSuccessRateColor(rate: number): (text: string) => string {
  if (rate >= 90) return chalk.green
  if (rate >= 70) return chalk.yellow
  return chalk.red
}

