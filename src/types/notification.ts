/**
 * 通知系统类型定义
 */

import type { PublishReport } from './publish.js'

/**
 * 通知类型
 */
export type NotificationType = 'success' | 'failure' | 'warning' | 'info'

/**
 * 通知渠道类型
 */
export type NotificationChannelType = 'dingtalk' | 'wecom' | 'slack' | 'email' | 'webhook'

/**
 * 通知触发条件
 */
export type NotificationTrigger = 'success' | 'failure' | 'always'

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** 是否启用通知 */
  enabled?: boolean

  /** 通知渠道列表 */
  channels?: NotificationChannel[]

  /** 默认触发条件 */
  defaultTriggers?: NotificationTrigger[]

  /** 自定义消息模板 */
  templates?: {
    success?: string
    failure?: string
    warning?: string
  }

  /** 是否包含详细信息 */
  includeDetails?: boolean

  /** 超时时间 (ms) */
  timeout?: number

  /** 重试次数 */
  retries?: number
}

/**
 * 通知渠道配置
 */
export interface NotificationChannel {
  /** 渠道类型 */
  type: NotificationChannelType

  /** 渠道名称 */
  name?: string

  /** 触发条件 */
  when?: NotificationTrigger[]

  /** 是否启用 */
  enabled?: boolean

  /** 渠道特定配置 */
  config: DingTalkConfig | WeComConfig | SlackConfig | EmailConfig | WebhookConfig
}

/**
 * 钉钉配置
 */
export interface DingTalkConfig {
  /** Webhook URL */
  webhook: string

  /** 密钥（可选） */
  secret?: string

  /** @所有人 */
  atAll?: boolean

  /** @指定人员 */
  atMobiles?: string[]
}

/**
 * 企业微信配置
 */
export interface WeComConfig {
  /** Webhook URL */
  webhook: string

  /** 提到的用户列表 */
  mentionedList?: string[]

  /** 提到的手机号列表 */
  mentionedMobileList?: string[]
}

/**
 * Slack 配置
 */
export interface SlackConfig {
  /** Webhook URL */
  webhook: string

  /** 频道 */
  channel?: string

  /** 用户名 */
  username?: string

  /** 图标 emoji */
  iconEmoji?: string
}

/**
 * 邮件配置
 */
export interface EmailConfig {
  /** SMTP 主机 */
  host: string

  /** SMTP 端口 */
  port: number

  /** 是否使用 SSL */
  secure?: boolean

  /** 认证信息 */
  auth: {
    user: string
    pass: string
  }

  /** 发件人 */
  from: string

  /** 收件人列表 */
  to: string[]

  /** 抄送列表 */
  cc?: string[]

  /** 邮件主题模板 */
  subject?: string
}

/**
 * 自定义 Webhook 配置
 */
export interface WebhookConfig {
  /** Webhook URL */
  url: string

  /** HTTP 方法 */
  method?: 'GET' | 'POST' | 'PUT'

  /** 请求头 */
  headers?: Record<string, string>

  /** 请求体模板 */
  bodyTemplate?: string

  /** 查询参数 */
  query?: Record<string, string>
}

/**
 * 通知消息
 */
export interface NotificationMessage {
  /** 消息类型 */
  type: NotificationType

  /** 消息标题 */
  title: string

  /** 消息内容 */
  content: string

  /** 发布报告 */
  report?: PublishReport

  /** 附加数据 */
  data?: Record<string, any>

  /** 时间戳 */
  timestamp?: number
}

/**
 * 通知发送结果
 */
export interface NotificationResult {
  /** 是否成功 */
  success: boolean

  /** 渠道名称 */
  channel: string

  /** 渠道类型 */
  channelType: NotificationChannelType

  /** 错误信息 */
  error?: string

  /** 耗时 (ms) */
  duration?: number

  /** 响应数据 */
  response?: any
}

/**
 * 通知发送报告
 */
export interface NotificationReport {
  /** 总数 */
  total: number

  /** 成功数 */
  successful: number

  /** 失败数 */
  failed: number

  /** 结果列表 */
  results: NotificationResult[]

  /** 总耗时 (ms) */
  duration: number
}
