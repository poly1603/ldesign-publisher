/**
 * 通知管理器
 * 
 * 负责发送各种类型的通知：
 * - 钉钉 Webhook
 * - 企业微信 Webhook
 * - Slack
 * - 邮件
 * - 自定义 Webhook
 */

import crypto from 'node:crypto'
import type {
  NotificationConfig,
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
  NotificationReport,
  NotificationType,
  NotificationTrigger,
  DingTalkConfig,
  WeComConfig,
  SlackConfig,
  EmailConfig,
  WebhookConfig,
} from '../types/notification.js'
import type { PublishReport } from '../types/publish.js'
import { logger } from '../utils/logger.js'

/**
 * 通知管理器类
 */
export class NotificationManager {
  private config: Required<NotificationConfig>

  constructor(config: NotificationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? false,
      channels: config.channels ?? [],
      defaultTriggers: config.defaultTriggers ?? ['always'],
      templates: config.templates ?? {},
      includeDetails: config.includeDetails ?? true,
      timeout: config.timeout ?? 10000,
      retries: config.retries ?? 2,
    }
  }

  /**
   * 发送发布通知
   */
  async sendPublishNotification(
    report: PublishReport,
  ): Promise<NotificationReport> {
    if (!this.config.enabled || this.config.channels.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
        duration: 0,
      }
    }

    const type: NotificationType = report.success ? 'success' : 'failure'
    const trigger: NotificationTrigger = report.success ? 'success' : 'failure'

    const message: NotificationMessage = {
      type,
      title: report.success ? '✅ 发布成功' : '❌ 发布失败',
      content: this.formatPublishMessage(report),
      report,
      timestamp: Date.now(),
    }

    return this.send(message, trigger)
  }

  /**
   * 发送通知
   */
  async send(
    message: NotificationMessage,
    trigger: NotificationTrigger = 'always',
  ): Promise<NotificationReport> {
    const startTime = Date.now()

    // 过滤需要发送的渠道
    const channels = this.config.channels.filter((channel) => {
      if (channel.enabled === false) return false

      const triggers = channel.when || this.config.defaultTriggers
      return triggers.includes(trigger) || triggers.includes('always')
    })

    if (channels.length === 0) {
      return {
        total: 0,
        successful: 0,
        failed: 0,
        results: [],
        duration: Date.now() - startTime,
      }
    }

    logger.debug(`开始发送通知，渠道数: ${channels.length}`)

    // 并发发送通知
    const results = await Promise.allSettled(
      channels.map((channel) => this.sendToChannel(channel, message)),
    )

    const notificationResults: NotificationResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          success: false,
          channel: channels[index].name || channels[index].type,
          channelType: channels[index].type,
          error: result.reason?.message || '未知错误',
        }
      }
    })

    const successful = notificationResults.filter((r) => r.success).length
    const failed = notificationResults.filter((r) => !r.success).length

    logger.debug(`通知发送完成: 成功 ${successful}, 失败 ${failed}`)

    return {
      total: channels.length,
      successful,
      failed,
      results: notificationResults,
      duration: Date.now() - startTime,
    }
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel,
    message: NotificationMessage,
  ): Promise<NotificationResult> {
    const startTime = Date.now()
    const channelName = channel.name || channel.type

    try {
      logger.debug(`发送通知到 ${channelName}...`)

      let response: any

      switch (channel.type) {
        case 'dingtalk':
          response = await this.sendToDingTalk(channel.config as DingTalkConfig, message)
          break
        case 'wecom':
          response = await this.sendToWeCom(channel.config as WeComConfig, message)
          break
        case 'slack':
          response = await this.sendToSlack(channel.config as SlackConfig, message)
          break
        case 'email':
          response = await this.sendToEmail(channel.config as EmailConfig, message)
          break
        case 'webhook':
          response = await this.sendToWebhook(channel.config as WebhookConfig, message)
          break
        default:
          throw new Error(`不支持的通知渠道类型: ${channel.type}`)
      }

      return {
        success: true,
        channel: channelName,
        channelType: channel.type,
        duration: Date.now() - startTime,
        response,
      }
    } catch (error: any) {
      logger.debug(`发送到 ${channelName} 失败: ${error.message}`)

      return {
        success: false,
        channel: channelName,
        channelType: channel.type,
        error: error.message,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 发送到钉钉
   */
  private async sendToDingTalk(
    config: DingTalkConfig,
    message: NotificationMessage,
  ): Promise<any> {
    const timestamp = Date.now()
    let url = config.webhook

    // 如果有密钥，需要签名
    if (config.secret) {
      const sign = this.generateDingTalkSign(timestamp, config.secret)
      url += `&timestamp=${timestamp}&sign=${sign}`
    }

    const body = {
      msgtype: 'markdown',
      markdown: {
        title: message.title,
        text: message.content,
      },
      at: {
        atMobiles: config.atMobiles || [],
        isAtAll: config.atAll || false,
      },
    }

    return this.httpRequest(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * 生成钉钉签名
   */
  private generateDingTalkSign(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(stringToSign)
    return encodeURIComponent(hmac.digest('base64'))
  }

  /**
   * 发送到企业微信
   */
  private async sendToWeCom(config: WeComConfig, message: NotificationMessage): Promise<any> {
    const body = {
      msgtype: 'markdown',
      markdown: {
        content: `${message.title}\n\n${message.content}`,
        mentioned_list: config.mentionedList,
        mentioned_mobile_list: config.mentionedMobileList,
      },
    }

    return this.httpRequest(config.webhook, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * 发送到 Slack
   */
  private async sendToSlack(config: SlackConfig, message: NotificationMessage): Promise<any> {
    const color = message.type === 'success' ? 'good' : message.type === 'failure' ? 'danger' : 'warning'

    const body = {
      channel: config.channel,
      username: config.username || 'Publisher',
      icon_emoji: config.iconEmoji || ':rocket:',
      attachments: [
        {
          color,
          title: message.title,
          text: message.content,
          ts: Math.floor((message.timestamp || Date.now()) / 1000),
        },
      ],
    }

    return this.httpRequest(config.webhook, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * 发送邮件
   */
  private async sendToEmail(config: EmailConfig, message: NotificationMessage): Promise<any> {
    // 注意：这里简化了实现，实际应该使用 nodemailer 等库
    // 为了减少依赖，这里只提供接口和基本实现
    logger.warn('邮件通知功能需要安装 nodemailer 依赖')

    // 尝试动态导入 nodemailer
    try {
      const nodemailer = await import('nodemailer').catch(() => null)
      if (!nodemailer) {
        throw new Error('请安装 nodemailer: pnpm add nodemailer')
      }

      const transporter = nodemailer.default.createTransport({
        host: config.host,
        port: config.port,
        secure: config.secure ?? false,
        auth: config.auth,
      })

      const subject = config.subject || message.title
      const html = `
        <h2>${message.title}</h2>
        <pre>${message.content}</pre>
        ${message.report && this.config.includeDetails ? `
          <hr>
          <h3>详细信息</h3>
          <pre>${JSON.stringify(message.report, null, 2)}</pre>
        ` : ''}
      `

      return await transporter.sendMail({
        from: config.from,
        to: config.to.join(', '),
        cc: config.cc?.join(', '),
        subject,
        html,
      })
    } catch (error: any) {
      throw new Error(`邮件发送失败: ${error.message}`)
    }
  }

  /**
   * 发送到自定义 Webhook
   */
  private async sendToWebhook(config: WebhookConfig, message: NotificationMessage): Promise<any> {
    let url = config.url

    // 添加查询参数
    if (config.query) {
      const params = new URLSearchParams(config.query)
      url += `?${params.toString()}`
    }

    // 处理请求体模板
    let body = config.bodyTemplate || JSON.stringify(message)
    body = this.interpolateTemplate(body, message)

    return this.httpRequest(url, {
      method: config.method || 'POST',
      body,
      headers: config.headers || { 'Content-Type': 'application/json' },
    })
  }

  /**
   * HTTP 请求
   */
  private async httpRequest(
    url: string,
    options: { method: string; body?: string; headers?: Record<string, string> },
  ): Promise<any> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: options.method,
        body: options.body,
        headers: options.headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.json().catch(() => ({ ok: true }))
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error(`请求超时 (${this.config.timeout}ms)`)
      }
      throw error
    }
  }

  /**
   * 格式化发布消息
   */
  private formatPublishMessage(report: PublishReport): string {
    const lines: string[] = []

    // 基本信息
    lines.push(`**状态**: ${report.success ? '✅ 成功' : '❌ 失败'}`)
    lines.push(`**耗时**: ${(report.duration / 1000).toFixed(2)}s`)
    lines.push('')

    // 统计信息
    if (report.published.length > 0) {
      lines.push(`**成功发布** (${report.published.length}):`)
      report.published.forEach((pkg) => {
        lines.push(`  - ${pkg.name}@${pkg.version}`)
      })
      lines.push('')
    }

    if (report.failed.length > 0) {
      lines.push(`**发布失败** (${report.failed.length}):`)
      report.failed.forEach((pkg) => {
        lines.push(`  - ${pkg.name}: ${pkg.error || '未知错误'}`)
      })
      lines.push('')
    }

    if (report.skipped.length > 0) {
      lines.push(`**已跳过** (${report.skipped.length}): ${report.skipped.join(', ')}`)
      lines.push('')
    }

    // 错误信息
    if (report.errors.length > 0 && this.config.includeDetails) {
      lines.push('**错误详情**:')
      report.errors.slice(0, 3).forEach((error) => {
        lines.push(`  - ${error.message}`)
      })
      if (report.errors.length > 3) {
        lines.push(`  - ... 还有 ${report.errors.length - 3} 个错误`)
      }
    }

    return lines.join('\n')
  }

  /**
   * 模板插值
   */
  private interpolateTemplate(template: string, message: NotificationMessage): string {
    return template
      .replace(/\{\{title\}\}/g, message.title)
      .replace(/\{\{content\}\}/g, message.content)
      .replace(/\{\{type\}\}/g, message.type)
      .replace(/\{\{timestamp\}\}/g, String(message.timestamp || Date.now()))
  }

  /**
   * 打印通知报告
   */
  printReport(report: NotificationReport): void {
    if (report.total === 0) {
      logger.info('未发送通知')
      return
    }

    logger.info(`通知发送完成: ${report.successful}/${report.total} 成功`)

    report.results.forEach((result) => {
      if (result.success) {
        logger.success(`  ✓ ${result.channel} (${result.duration}ms)`)
      } else {
        logger.error(`  ✗ ${result.channel}: ${result.error}`)
      }
    })
  }
}

/**
 * 创建通知管理器
 */
export function createNotificationManager(config?: NotificationConfig): NotificationManager {
  return new NotificationManager(config)
}
