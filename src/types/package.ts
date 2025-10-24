/**
 * 包信息和依赖关系类型定义
 */

/**
 * 包信息
 */
export interface PackageInfo {
  /** 包名 */
  name: string

  /** 版本 */
  version: string

  /** 描述 */
  description?: string

  /** 包目录路径 */
  path: string

  /** package.json 路径 */
  packageJsonPath: string

  /** package.json 内容 */
  packageJson: PackageJson

  /** 是否为私有包 */
  private?: boolean

  /** 依赖关系 */
  dependencies?: Record<string, string>

  /** 开发依赖 */
  devDependencies?: Record<string, string>

  /** Peer 依赖 */
  peerDependencies?: Record<string, string>

  /** 工作空间依赖 */
  workspaceDependencies?: string[]

  /** 构建产物目录 */
  distDir?: string

  /** 入口文件 */
  main?: string

  /** 模块入口 */
  module?: string

  /** 类型声明文件 */
  types?: string

  /** 发布文件列表 */
  files?: string[]

  /** 是否已构建 */
  isBuilt?: boolean

  /** 构建产物大小 */
  buildSize?: number
}

/**
 * Package.json 类型
 */
export interface PackageJson {
  name: string
  version: string
  description?: string
  keywords?: string[]
  author?: string | PackageAuthor
  license?: string
  homepage?: string
  repository?: string | PackageRepository
  bugs?: string | PackageBugs
  private?: boolean
  main?: string
  module?: string
  types?: string
  exports?: Record<string, any>
  bin?: string | Record<string, string>
  files?: string[]
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  bundledDependencies?: string[]
  engines?: Record<string, string>
  publishConfig?: PublishConfig
  workspaces?: string[]
  [key: string]: any
}

/**
 * Package 作者
 */
export interface PackageAuthor {
  name: string
  email?: string
  url?: string
}

/**
 * Package 仓库
 */
export interface PackageRepository {
  type: string
  url: string
  directory?: string
}

/**
 * Package bugs
 */
export interface PackageBugs {
  url: string
  email?: string
}

/**
 * 发布配置
 */
export interface PublishConfig {
  registry?: string
  access?: 'public' | 'restricted'
  tag?: string
  directory?: string
}

/**
 * 包依赖图
 */
export interface PackageDependencyGraph {
  /** 包信息映射 */
  packages: Map<string, PackageInfo>

  /** 依赖关系 */
  dependencies: Map<string, Set<string>>

  /** 被依赖关系 */
  dependents: Map<string, Set<string>>

  /** 拓扑排序后的包列表 */
  topologicalOrder?: string[]

  /** 循环依赖 */
  circularDependencies?: string[][]
}

/**
 * 工作空间信息
 */
export interface WorkspaceInfo {
  /** 工作空间根目录 */
  root: string

  /** 包模式 */
  packages: string[]

  /** 所有包信息 */
  allPackages: PackageInfo[]

  /** 包映射 */
  packageMap: Map<string, PackageInfo>

  /** 依赖图 */
  dependencyGraph: PackageDependencyGraph

  /** 工作空间协议 */
  protocol: 'pnpm' | 'yarn' | 'npm'
}

/**
 * 包发布状态
 */
export interface PackagePublishStatus {
  /** 包名 */
  name: string

  /** 版本 */
  version: string

  /** 发布状态 */
  status: 'pending' | 'publishing' | 'published' | 'failed' | 'skipped'

  /** 发布时间 */
  publishTime?: number

  /** Registry */
  registry?: string

  /** 错误信息 */
  error?: Error

  /** 发布结果 */
  result?: PublishResult
}

/**
 * 发布结果
 */
export interface PublishResult {
  /** 包名 */
  name: string

  /** 版本 */
  version: string

  /** 发布成功 */
  success: boolean

  /** Registry */
  registry: string

  /** 包 URL */
  packageUrl?: string

  /** 发布耗时 (ms) */
  duration?: number

  /** 包大小 */
  size?: number

  /** Tarball URL */
  tarballUrl?: string

  /** 错误信息 */
  error?: string
}

