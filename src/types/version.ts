/**
 * 版本管理类型定义
 */

/**
 * 版本策略
 */
export type VersionStrategy = 'fixed' | 'independent'

/**
 * 版本类型
 */
export type VersionBumpType = 'major' | 'minor' | 'patch' | 'premajor' | 'preminor' | 'prepatch' | 'prerelease'

/**
 * 预发布标签
 */
export type PreReleaseTag = 'alpha' | 'beta' | 'rc' | 'next' | 'canary' | string

/**
 * 版本信息
 */
export interface VersionInfo {
  /** 当前版本 */
  version: string

  /** 新版本 */
  newVersion?: string

  /** 版本类型 */
  type?: VersionBumpType

  /** 预发布标签 */
  preReleaseTag?: PreReleaseTag

  /** Git commit hash */
  gitCommit?: string

  /** Git branch */
  gitBranch?: string

  /** Git tag */
  gitTag?: string

  /** 构建时间 */
  buildTime?: string

  /** 构建号 */
  buildNumber?: string

  /** 是否为预发布版本 */
  isPreRelease?: boolean
}

/**
 * 版本更新选项
 */
export interface VersionUpdateOptions {
  /** 版本类型 */
  type?: VersionBumpType

  /** 指定版本号 */
  version?: string

  /** 预发布标签 */
  preReleaseTag?: PreReleaseTag

  /** 预发布标识符 */
  preid?: string

  /** 是否更新工作空间依赖 */
  updateWorkspaceDependencies?: boolean

  /** 是否创建 Git tag */
  createTag?: boolean

  /** 是否创建 commit */
  createCommit?: boolean

  /** 是否生成 changelog */
  generateChangelog?: boolean

  /** 是否跳过验证 */
  skipValidation?: boolean

  /** 工作目录 */
  cwd?: string
}

/**
 * 版本比较结果
 */
export interface VersionComparison {
  /** 是否相等 */
  equal: boolean

  /** 是否大于 */
  greater: boolean

  /** 是否小于 */
  less: boolean

  /** 版本差异 */
  diff?: VersionBumpType

  /** 版本距离 */
  distance?: number
}

/**
 * 版本推荐结果
 */
export interface VersionRecommendation {
  /** 推荐的版本类型 */
  releaseType: VersionBumpType

  /** 推荐的版本号 */
  version: string

  /** 推荐原因 */
  reason: string

  /** 关联的 commits */
  commits?: ConventionalCommit[]
}

/**
 * Conventional Commit
 */
export interface ConventionalCommit {
  /** Commit hash */
  hash: string

  /** Commit 类型 */
  type: string

  /** Commit scope */
  scope?: string

  /** Commit 主题 */
  subject: string

  /** Commit 正文 */
  body?: string

  /** Commit footer */
  footer?: string

  /** 是否为 breaking change */
  breaking?: boolean

  /** 关联的 issues */
  issues?: string[]

  /** 作者 */
  author?: {
    name: string
    email: string
  }

  /** Commit 时间 */
  date?: string
}

