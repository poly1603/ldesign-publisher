/**
 * Changelog 类型定义
 */

import type { ConventionalCommit } from './version.js'

/**
 * Changelog 选项
 */
export interface ChangelogOptions {
  /** 是否启用 */
  enabled?: boolean

  /** 是否使用 conventional commits */
  conventional?: boolean

  /** 输出文件路径 */
  output?: string

  /** 模板文件路径 */
  template?: string

  /** 是否包含所有提交 */
  includeAllCommits?: boolean

  /** 提交类型配置 */
  types?: CommitTypeConfig[]

  /** 是否按类型分组 */
  groupByType?: boolean

  /** 是否包含作者 */
  includeAuthors?: boolean

  /** 是否包含 PR 链接 */
  includePRLinks?: boolean

  /** 是否包含 commit hash */
  includeCommitHash?: boolean

  /** 标题格式 */
  headerFormat?: string

  /** 日期格式 */
  dateFormat?: string

  /** 语言 */
  language?: 'zh-CN' | 'en-US' | 'ja-JP'

  /** 自定义节标题 */
  sectionTitles?: Record<string, string>

  /** 是否生成完整 changelog */
  regenerate?: boolean

  /** 从哪个版本开始 */
  from?: string

  /** 到哪个版本结束 */
  to?: string
}

/**
 * Commit 类型配置
 */
export interface CommitTypeConfig {
  /** 类型 */
  type: string

  /** 显示名称 */
  section?: string

  /** 是否隐藏 */
  hidden?: boolean

  /** 排序优先级 */
  priority?: number
}

/**
 * Changelog 内容
 */
export interface ChangelogContent {
  /** 版本 */
  version: string

  /** 发布日期 */
  date: string

  /** 按类型分组的提交 */
  sections: ChangelogSection[]

  /** 所有提交 */
  commits: ConventionalCommit[]

  /** Breaking changes */
  breakingChanges?: ChangelogBreakingChange[]

  /** 贡献者 */
  contributors?: ChangelogContributor[]

  /** 原始内容 */
  raw?: string
}

/**
 * Changelog 章节
 */
export interface ChangelogSection {
  /** 章节标题 */
  title: string

  /** 提交类型 */
  type: string

  /** 提交列表 */
  commits: ChangelogCommit[]
}

/**
 * Changelog 提交
 */
export interface ChangelogCommit {
  /** Commit hash */
  hash: string

  /** 短 hash */
  shortHash: string

  /** 类型 */
  type: string

  /** Scope */
  scope?: string

  /** 主题 */
  subject: string

  /** 正文 */
  body?: string

  /** 作者 */
  author?: {
    name: string
    email: string
  }

  /** PR 编号 */
  pr?: string

  /** PR 链接 */
  prLink?: string

  /** Issues */
  issues?: string[]

  /** 是否为 breaking change */
  breaking?: boolean

  /** 日期 */
  date?: string
}

/**
 * Breaking Change
 */
export interface ChangelogBreakingChange {
  /** 描述 */
  description: string

  /** 关联提交 */
  commit: ChangelogCommit

  /** 迁移指南 */
  migration?: string
}

/**
 * 贡献者
 */
export interface ChangelogContributor {
  /** 姓名 */
  name: string

  /** 邮箱 */
  email: string

  /** 提交数 */
  commits: number

  /** GitHub 用户名 */
  username?: string
}

/**
 * Changelog 生成器配置
 */
export interface ChangelogGeneratorConfig {
  /** 工作目录 */
  cwd?: string

  /** 包名 */
  packageName?: string

  /** 当前版本 */
  version?: string

  /** 选项 */
  options?: ChangelogOptions

  /** Preset */
  preset?: 'angular' | 'conventionalcommits' | 'atom' | 'ember' | string

  /** 自定义 Preset 配置 */
  presetConfig?: any
}

