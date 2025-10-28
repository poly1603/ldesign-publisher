/**
 * Publisher 配置类型定义
 */

import type { VersionStrategy, PreReleaseTag } from './version.js'
import type { ChangelogOptions } from './changelog.js'
import type { NotificationConfig } from './notification.js'

/**
 * 发布配置
 */
export interface PublisherConfig {
  /** 工作目录 */
  cwd?: string

  /** 版本策略 */
  versionStrategy?: VersionStrategy

  /** Registry 配置 */
  registries?: Record<string, RegistryConfig>

  /** 默认 registry */
  defaultRegistry?: string

  /** 发布选项 */
  publish?: PublishOptions

  /** Changelog 配置 */
  changelog?: ChangelogOptions

  /** 验证规则 */
  validation?: ValidationOptions

  /** 生命周期钩子 */
  hooks?: LifecycleHooks

  /** Git 配置 */
  git?: GitOptions

  /** Monorepo 配置 */
  monorepo?: MonorepoOptions

  /** 通知配置 */
  notifications?: NotificationConfig

  /** 并发配置 */
  concurrency?: number

  /** 是否启用调试模式 */
  debug?: boolean

  /** 日志级别 */
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose'
}

/**
 * Registry 配置
 */
export interface RegistryConfig {
  /** Registry URL */
  url: string

  /** 认证 token */
  token?: string

  /** 访问级别 */
  access?: 'public' | 'restricted'

  /** Scope 映射 */
  scopes?: string[]

  /** 是否启用 2FA */
  otp?: boolean

  /** 自定义请求头 */
  headers?: Record<string, string>

  /** 超时时间 (ms) */
  timeout?: number
}

/**
 * 发布选项
 */
export interface PublishOptions {
  /** 目标 registry */
  registry?: string

  /** 访问级别 */
  access?: 'public' | 'restricted'

  /** 发布 tag */
  tag?: string

  /** 是否启用 2FA */
  otp?: boolean | string

  /** 是否启用 dry-run */
  dryRun?: boolean

  /** 是否跳过构建 */
  skipBuild?: boolean

  /** 是否跳过测试 */
  skipTests?: boolean

  /** 是否跳过 Git 检查 */
  skipGitCheck?: boolean

  /** 是否强制发布 */
  force?: boolean

  /** 重试次数 */
  retries?: number

  /** 重试延迟 (ms) */
  retryDelay?: number

  /** 是否并行发布 */
  parallel?: boolean

  /** 发布前确认 */
  confirm?: boolean

  /** 自定义发布目录 */
  publishDir?: string
}

/**
 * 验证选项
 */
export interface ValidationOptions {
  /** 是否要求工作区干净 */
  requireCleanWorkingDirectory?: boolean

  /** 允许的分支 */
  allowedBranches?: string[]

  /** 是否要求测试通过 */
  requireTests?: boolean

  /** 是否要求构建成功 */
  requireBuild?: boolean

  /** 是否检查 npm 凭证 */
  requireNpmCredentials?: boolean

  /** 包必需文件 */
  requiredFiles?: string[]

  /** 包大小限制 (bytes) */
  maxPackageSize?: number

  /** 是否扫描敏感信息 */
  scanSensitiveData?: boolean

  /** 敏感文件模式 */
  sensitivePatterns?: string[]

  /** 是否检查版本冲突 */
  checkVersionConflict?: boolean

  /** 自定义验证器 */
  customValidators?: Array<(packageInfo: any) => Promise<ValidationResult>>
}

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否通过 */
  valid: boolean

  /** 错误信息 */
  errors?: ValidationError[]

  /** 警告信息 */
  warnings?: ValidationWarning[]
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误代码 */
  code: string

  /** 错误消息 */
  message: string

  /** 错误详情 */
  details?: any

  /** 修复建议 */
  suggestion?: string
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 警告代码 */
  code: string

  /** 警告消息 */
  message: string

  /** 警告详情 */
  details?: any
}

/**
 * 生命周期钩子
 */
export interface LifecycleHooks {
  /** 发布前钩子 */
  prePublish?: string | string[] | (() => Promise<void>)

  /** 发布后钩子 */
  postPublish?: string | string[] | ((result: any) => Promise<void>)

  /** 版本更新前钩子 */
  preVersion?: string | string[] | (() => Promise<void>)

  /** 版本更新后钩子 */
  postVersion?: string | string[] | ((version: string) => Promise<void>)

  /** Changelog 生成前钩子 */
  preChangelog?: string | string[] | (() => Promise<void>)

  /** Changelog 生成后钩子 */
  postChangelog?: string | string[] | ((changelog: string) => Promise<void>)

  /** 验证前钩子 */
  preValidate?: string | string[] | (() => Promise<void>)

  /** 验证后钩子 */
  postValidate?: string | string[] | ((result: ValidationResult) => Promise<void>)
}

/**
 * Git 配置
 */
export interface GitOptions {
  /** 是否创建 tag */
  createTag?: boolean

  /** Tag 前缀 */
  tagPrefix?: string

  /** Tag 消息模板 */
  tagMessage?: string

  /** 是否推送 tag */
  pushTag?: boolean

  /** 是否创建 commit */
  createCommit?: boolean

  /** Commit 消息模板 */
  commitMessage?: string

  /** 是否推送 commit */
  pushCommit?: boolean

  /** 远程仓库名称 */
  remote?: string

  /** 是否签名 commit */
  signCommit?: boolean

  /** 是否签名 tag */
  signTag?: boolean

  /** 要包含的文件 */
  commitFiles?: string[]
}

/**
 * Monorepo 配置
 */
export interface MonorepoOptions {
  /** 包目录模式 */
  packages?: string[]

  /** 是否启用工作空间 */
  useWorkspaces?: boolean

  /** 工作空间协议 */
  workspaceProtocol?: 'pnpm' | 'yarn' | 'npm'

  /** 是否更新工作空间依赖 */
  updateWorkspaceDependencies?: boolean

  /** 包过滤器 */
  filter?: string | string[]

  /** 是否忽略私有包 */
  ignorePrivate?: boolean

  /** 是否按拓扑顺序发布 */
  topologicalSort?: boolean

  /** 发布顺序策略 */
  publishOrder?: 'parallel' | 'serial' | 'auto'
}

/**
 * 配置文件类型
 */
export type ConfigFileType = 'ts' | 'js' | 'mjs' | 'json'

/**
 * 配置加载选项
 */
export interface ConfigLoadOptions {
  /** 配置文件路径 */
  configFile?: string

  /** 是否合并环境变量 */
  mergeEnv?: boolean

  /** 是否验证配置 */
  validate?: boolean

  /** 工作目录 */
  cwd?: string
}

