/**
 * 发布统计分析 - 记录和分析发布历史
 * 
 * 功能：
 * - 记录每次发布的详细信息
 * - 统计发布成功率
 * - 分析发布时长趋势
 * - 生成统计报告
 * 
 * @example
 * ```typescript
 * const analytics = new PublishAnalytics()
 * 
 * // 记录发布
 * await analytics.recordPublish({
 *   packages: ['@scope/pkg1', '@scope/pkg2'],
 *   success: true,
 *   duration: 45000
 * })
 * 
 * // 获取统计
 * const stats = await analytics.getStatistics()
 * console.log(`成功率: ${stats.successRate}%`)
 * ```
 */

import { join } from 'path'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import type { PublishReport } from '../types/index.js'
import { logger } from '../utils/logger.js'

/**
 * 发布记录
 */
export interface PublishRecord {
  /** 记录 ID */
  id: string
  /** 发布时间戳 */
  timestamp: number
  /** 发布日期 */
  date: string
  /** 发布的包 */
  packages: string[]
  /** 是否成功 */
  success: boolean
  /** 发布耗时 (ms) */
  duration: number
  /** 发布者 */
  publisher?: string
  /** Git commit */
  gitCommit?: string
  /** 错误信息 */
  error?: string
  /** 包数量 */
  packageCount: number
}

/**
 * 统计数据
 */
export interface PublishStatistics {
  /** 总发布次数 */
  totalPublishes: number
  /** 成功次数 */
  successfulPublishes: number
  /** 失败次数 */
  failedPublishes: number
  /** 成功率 */
  successRate: number
  /** 平均发布时长 (ms) */
  averageDuration: number
  /** 总发布包数 */
  totalPackages: number
  /** 最近一次发布 */
  lastPublish?: PublishRecord
  /** 最快的发布 */
  fastestPublish?: PublishRecord
  /** 最慢的发布 */
  slowestPublish?: PublishRecord
  /** 按日期统计 */
  byDate: Record<string, number>
  /** 按月统计 */
  byMonth: Record<string, number>
}

/**
 * 发布统计分析类
 */
export class PublishAnalytics {
  private cwd: string
  private dataDir: string
  private recordsFile: string

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd
    this.dataDir = join(cwd, '.publisher')
    this.recordsFile = join(this.dataDir, 'publish-records.json')
  }

  /**
   * 初始化数据目录
   * 
   * @private
   */
  private async ensureDataDir(): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true })
    }
  }

  /**
   * 记录发布
   * 
   * @param report - 发布报告
   * 
   * @example
   * ```typescript
   * const analytics = new PublishAnalytics()
   * await analytics.recordPublish(publishReport)
   * ```
   */
  async recordPublish(report: PublishReport): Promise<void> {
    await this.ensureDataDir()

    const record: PublishRecord = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      date: new Date().toISOString().split('T')[0],
      packages: report.published.map(p => p.name),
      success: report.success,
      duration: report.duration,
      packageCount: report.published.length,
      error: report.errors.length > 0 ? report.errors[0].message : undefined,
    }

    try {
      const records = await this.loadRecords()
      records.push(record)
      await this.saveRecords(records)
      logger.debug(`发布记录已保存: ${record.id}`)
    } catch (error: any) {
      logger.warn(`保存发布记录失败: ${error.message}`)
    }
  }

  /**
   * 加载记录
   * 
   * @private
   */
  private async loadRecords(): Promise<PublishRecord[]> {
    try {
      if (!existsSync(this.recordsFile)) {
        return []
      }

      const content = await readFile(this.recordsFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      logger.debug('加载发布记录失败，返回空数组')
      return []
    }
  }

  /**
   * 保存记录
   * 
   * @private
   */
  private async saveRecords(records: PublishRecord[]): Promise<void> {
    const content = JSON.stringify(records, null, 2)
    await writeFile(this.recordsFile, content, 'utf-8')
  }

  /**
   * 获取统计数据
   * 
   * @returns 统计数据
   * 
   * @example
   * ```typescript
   * const stats = await analytics.getStatistics()
   * console.log(`总发布次数: ${stats.totalPublishes}`)
   * console.log(`成功率: ${stats.successRate}%`)
   * ```
   */
  async getStatistics(): Promise<PublishStatistics> {
    const records = await this.loadRecords()

    if (records.length === 0) {
      return {
        totalPublishes: 0,
        successfulPublishes: 0,
        failedPublishes: 0,
        successRate: 0,
        averageDuration: 0,
        totalPackages: 0,
        byDate: {},
        byMonth: {},
      }
    }

    const successfulPublishes = records.filter(r => r.success).length
    const failedPublishes = records.length - successfulPublishes
    const successRate = (successfulPublishes / records.length) * 100

    const totalDuration = records.reduce((sum, r) => sum + r.duration, 0)
    const averageDuration = totalDuration / records.length

    const totalPackages = records.reduce((sum, r) => sum + r.packageCount, 0)

    // 按日期统计
    const byDate: Record<string, number> = {}
    const byMonth: Record<string, number> = {}

    for (const record of records) {
      const date = record.date
      const month = date.substring(0, 7) // YYYY-MM

      byDate[date] = (byDate[date] || 0) + 1
      byMonth[month] = (byMonth[month] || 0) + 1
    }

    // 查找最快和最慢的发布
    const sortedByDuration = [...records].sort((a, b) => a.duration - b.duration)

    return {
      totalPublishes: records.length,
      successfulPublishes,
      failedPublishes,
      successRate: parseFloat(successRate.toFixed(2)),
      averageDuration: Math.round(averageDuration),
      totalPackages,
      lastPublish: records[records.length - 1],
      fastestPublish: sortedByDuration[0],
      slowestPublish: sortedByDuration[sortedByDuration.length - 1],
      byDate,
      byMonth,
    }
  }

  /**
   * 获取最近的发布记录
   * 
   * @param limit - 返回数量
   * @returns 发布记录数组
   */
  async getRecentPublishes(limit = 10): Promise<PublishRecord[]> {
    const records = await this.loadRecords()
    return records.slice(-limit).reverse()
  }

  /**
   * 清除所有记录
   */
  async clearRecords(): Promise<void> {
    await this.saveRecords([])
    logger.info('发布记录已清除')
  }

  /**
   * 生成统计报告
   * 
   * @returns 格式化的报告字符串
   */
  async generateReport(): Promise<string> {
    const stats = await this.getStatistics()
    const lines: string[] = []

    lines.push('发布统计报告')
    lines.push('='.repeat(50))
    lines.push('')
    lines.push(`总发布次数: ${stats.totalPublishes}`)
    lines.push(`成功次数: ${stats.successfulPublishes}`)
    lines.push(`失败次数: ${stats.failedPublishes}`)
    lines.push(`成功率: ${stats.successRate}%`)
    lines.push(`平均耗时: ${(stats.averageDuration / 1000).toFixed(2)}s`)
    lines.push(`总发布包数: ${stats.totalPackages}`)
    lines.push('')

    if (stats.lastPublish) {
      lines.push('最近一次发布:')
      lines.push(`  时间: ${new Date(stats.lastPublish.timestamp).toLocaleString()}`)
      lines.push(`  包数: ${stats.lastPublish.packageCount}`)
      lines.push(`  状态: ${stats.lastPublish.success ? '成功' : '失败'}`)
      lines.push(`  耗时: ${(stats.lastPublish.duration / 1000).toFixed(2)}s`)
      lines.push('')
    }

    // 按月统计
    if (Object.keys(stats.byMonth).length > 0) {
      lines.push('按月统计:')
      const months = Object.keys(stats.byMonth).sort().reverse().slice(0, 6)
      for (const month of months) {
        lines.push(`  ${month}: ${stats.byMonth[month]} 次`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 打印统计报告
   */
  async printReport(): Promise<void> {
    const report = await this.generateReport()
    logger.log(report)
  }
}

/**
 * 创建发布统计实例
 * 
 * @param cwd - 工作目录
 * @returns 发布统计实例
 */
export function createPublishAnalytics(cwd?: string): PublishAnalytics {
  return new PublishAnalytics(cwd)
}

