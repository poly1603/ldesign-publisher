/**
 * 发布流程类型定义
 */

import type { PackageInfo, PackagePublishStatus, PublishResult } from './package.js'
import type { VersionInfo } from './version.js'
import type { ChangelogContent } from './changelog.js'

/**
 * 发布上下文
 */
export interface PublishContext {
  /** 工作目录 */
  cwd: string

  /** 包信息 */
  packages: PackageInfo[]

  /** 当前包 */
  currentPackage?: PackageInfo

  /** 版本信息 */
  versionInfo?: VersionInfo

  /** Changelog */
  changelog?: ChangelogContent

  /** 发布状态 */
  publishStatus: Map<string, PackagePublishStatus>

  /** 开始时间 */
  startTime: number

  /** 是否 dry-run */
  dryRun: boolean

  /** Registry */
  registry?: string

  /** 发布 tag */
  tag?: string

  /** OTP */
  otp?: string

  /** 错误列表 */
  errors: PublishError[]

  /** 警告列表 */
  warnings: PublishWarning[]
}

/**
 * 发布错误
 */
export interface PublishError {
  /** 包名 */
  package?: string

  /** 错误代码 */
  code: string

  /** 错误消息 */
  message: string

  /** 错误详情 */
  details?: any

  /** 错误栈 */
  stack?: string

  /** 是否致命 */
  fatal?: boolean

  /** 修复建议 */
  suggestion?: string
}

/**
 * 发布警告
 */
export interface PublishWarning {
  /** 包名 */
  package?: string

  /** 警告代码 */
  code: string

  /** 警告消息 */
  message: string

  /** 警告详情 */
  details?: any
}

/**
 * 发布报告
 */
export interface PublishReport {
  /** 是否成功 */
  success: boolean

  /** 发布的包 */
  published: PublishResult[]

  /** 失败的包 */
  failed: PublishResult[]

  /** 跳过的包 */
  skipped: string[]

  /** 总耗时 */
  duration: number

  /** 错误列表 */
  errors: PublishError[]

  /** 警告列表 */
  warnings: PublishWarning[]

  /** 发布摘要 */
  summary: string

  /** 详细日志 */
  logs?: string[]
}

/**
 * 发布任务
 */
export interface PublishTask {
  /** 任务 ID */
  id: string

  /** 任务类型 */
  type: 'validate' | 'build' | 'version' | 'changelog' | 'publish' | 'git' | 'cleanup'

  /** 任务标题 */
  title: string

  /** 包名 */
  package?: string

  /** 任务状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

  /** 任务函数 */
  task: () => Promise<any>

  /** 是否必需 */
  required?: boolean

  /** 依赖的任务 */
  dependencies?: string[]

  /** 任务结果 */
  result?: any

  /** 错误信息 */
  error?: Error

  /** 开始时间 */
  startTime?: number

  /** 结束时间 */
  endTime?: number
}

/**
 * 回滚选项
 */
export interface RollbackOptions {
  /** 要回滚的版本 */
  version?: string

  /** 回滚原因 */
  reason?: string

  /** 是否使用 unpublish */
  unpublish?: boolean

  /** 是否使用 deprecate */
  deprecate?: boolean

  /** Deprecate 消息 */
  deprecateMessage?: string

  /** 是否恢复 Git */
  revertGit?: boolean

  /** 是否删除 tag */
  deleteTag?: boolean

  /** 是否恢复文件 */
  restoreFiles?: boolean

  /** Registry */
  registry?: string

  /** 工作目录 */
  cwd?: string
}

/**
 * 回滚记录
 */
export interface RollbackRecord {
  /** 记录 ID */
  id: string

  /** 包名 */
  package: string

  /** 回滚的版本 */
  version: string

  /** 回滚原因 */
  reason: string

  /** 回滚时间 */
  timestamp: number

  /** 回滚操作 */
  actions: RollbackAction[]

  /** 是否成功 */
  success: boolean

  /** 错误信息 */
  error?: string
}

/**
 * 回滚操作
 */
export interface RollbackAction {
  /** 操作类型 */
  type: 'unpublish' | 'deprecate' | 'revert-git' | 'delete-tag' | 'restore-files'

  /** 操作描述 */
  description: string

  /** 是否成功 */
  success: boolean

  /** 错误信息 */
  error?: string

  /** 操作时间 */
  timestamp: number
}

/**
 * 发布历史记录
 */
export interface PublishHistory {
  /** 记录 ID */
  id: string

  /** 包名 */
  package: string

  /** 版本 */
  version: string

  /** Registry */
  registry: string

  /** 发布时间 */
  timestamp: number

  /** 发布者 */
  publisher?: string

  /** Git commit */
  gitCommit?: string

  /** Git tag */
  gitTag?: string

  /** 是否成功 */
  success: boolean

  /** 错误信息 */
  error?: string

  /** 发布耗时 */
  duration?: number
}

