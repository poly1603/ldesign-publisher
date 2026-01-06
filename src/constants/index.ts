/**
 * @ldesign/publisher - 常量定义模块
 * 
 * 集中管理所有默认配置、错误代码、阈值等常量
 * @packageDocumentation
 */

import type { CommitTypeConfig } from '../types/index.js'

// ============ 默认配置 ============

/**
 * 默认发布配置
 */
export const DEFAULT_CONFIG = {
  /** 默认版本策略 */
  versionStrategy: 'independent' as const,
  
  /** 默认并发数 */
  concurrency: 4,
  
  /** 默认日志级别 */
  logLevel: 'info' as const,
  
  /** 是否启用调试 */
  debug: false,
  
  /** 默认 tag */
  defaultTag: 'latest',
  
  /** 默认访问级别 */
  defaultAccess: 'public' as const,
} as const

/**
 * 默认发布选项
 */
export const DEFAULT_PUBLISH_OPTIONS = {
  /** 是否启用 dry-run */
  dryRun: false,
  
  /** 发布 tag */
  tag: 'latest',
  
  /** 是否跳过构建 */
  skipBuild: false,
  
  /** 是否跳过测试 */
  skipTests: false,
  
  /** 是否跳过 Git 检查 */
  skipGitCheck: false,
  
  /** 是否强制发布 */
  force: false,
  
  /** 是否并行发布 */
  parallel: false,
  
  /** 发布前确认 */
  confirm: true,
  
  /** 重试次数 */
  retries: 3,
  
  /** 重试延迟 (ms) */
  retryDelay: 1000,
} as const

/**
 * 默认验证选项
 */
export const DEFAULT_VALIDATION_OPTIONS = {
  /** 是否要求工作区干净 */
  requireCleanWorkingDirectory: true,
  
  /** 允许的分支 */
  allowedBranches: ['main', 'master'],
  
  /** 是否要求测试通过 */
  requireTests: false,
  
  /** 是否要求构建成功 */
  requireBuild: true,
  
  /** 是否检查 npm 凭证 */
  requireNpmCredentials: true,
  
  /** 包大小限制 (10MB) */
  maxPackageSize: 10 * 1024 * 1024,
  
  /** 是否扫描敏感信息 */
  scanSensitiveData: true,
  
  /** 是否检查版本冲突 */
  checkVersionConflict: true,
} as const

/**
 * 默认 Git 选项
 */
export const DEFAULT_GIT_OPTIONS = {
  /** 是否创建 tag */
  createTag: true,
  
  /** Tag 前缀 */
  tagPrefix: 'v',
  
  /** 是否推送 tag */
  pushTag: true,
  
  /** 是否创建 commit */
  createCommit: true,
  
  /** Commit 消息模板 */
  commitMessage: 'chore(release): publish {version}',
  
  /** 是否推送 commit */
  pushCommit: true,
  
  /** 远程仓库名称 */
  remote: 'origin',
  
  /** 是否签名 commit */
  signCommit: false,
  
  /** 是否签名 tag */
  signTag: false,
} as const

/**
 * 默认 Monorepo 选项
 */
export const DEFAULT_MONOREPO_OPTIONS = {
  /** 是否启用工作空间 */
  useWorkspaces: true,
  
  /** 工作空间协议 */
  workspaceProtocol: 'pnpm' as const,
  
  /** 是否更新工作空间依赖 */
  updateWorkspaceDependencies: true,
  
  /** 是否忽略私有包 */
  ignorePrivate: true,
  
  /** 是否按拓扑顺序发布 */
  topologicalSort: true,
  
  /** 发布顺序策略 */
  publishOrder: 'auto' as const,
} as const

// ============ 错误代码 ============

/**
 * 标准化错误代码
 */
export const ERROR_CODES = {
  // 配置错误 (1xx)
  CONFIG_NOT_FOUND: 'E100',
  CONFIG_INVALID: 'E101',
  CONFIG_PARSE_ERROR: 'E102',
  
  // 验证错误 (2xx)
  VALIDATION_FAILED: 'E200',
  GIT_DIRTY: 'E201',
  BRANCH_NOT_ALLOWED: 'E202',
  TESTS_FAILED: 'E203',
  BUILD_FAILED: 'E204',
  SENSITIVE_DATA_FOUND: 'E205',
  PACKAGE_TOO_LARGE: 'E206',
  VERSION_CONFLICT: 'E207',
  
  // 版本错误 (3xx)
  INVALID_VERSION: 'E300',
  VERSION_UPDATE_FAILED: 'E301',
  VERSION_ALREADY_EXISTS: 'E302',
  
  // 发布错误 (4xx)
  PUBLISH_FAILED: 'E400',
  REGISTRY_AUTH_FAILED: 'E401',
  REGISTRY_NOT_FOUND: 'E402',
  NETWORK_ERROR: 'E403',
  TIMEOUT: 'E404',
  OTP_REQUIRED: 'E405',
  RATE_LIMITED: 'E406',
  
  // Git 错误 (5xx)
  GIT_ERROR: 'E500',
  GIT_TAG_EXISTS: 'E501',
  GIT_PUSH_FAILED: 'E502',
  GIT_COMMIT_FAILED: 'E503',
  
  // 依赖错误 (6xx)
  CIRCULAR_DEPENDENCY: 'E600',
  DEPENDENCY_NOT_FOUND: 'E601',
  WORKSPACE_ERROR: 'E602',
  
  // 钩子错误 (7xx)
  HOOK_FAILED: 'E700',
  HOOK_TIMEOUT: 'E701',
  INVALID_HOOK_TYPE: 'E702',
  
  // 回滚错误 (8xx)
  ROLLBACK_FAILED: 'E800',
  UNPUBLISH_NOT_ALLOWED: 'E801',
  VERSION_NOT_FOUND: 'E802',
  
  // 未知错误
  UNKNOWN: 'E999',
} as const

/**
 * 错误代码类型
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// ============ Commit 类型 ============

/**
 * 默认 Conventional Commits 类型配置
 */
export const COMMIT_TYPES: CommitTypeConfig[] = [
  { type: 'feat', section: '✨ 新功能', priority: 1 },
  { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
  { type: 'perf', section: '⚡ 性能优化', priority: 3 },
  { type: 'refactor', section: '♻️ 代码重构', priority: 4 },
  { type: 'docs', section: '📝 文档更新', priority: 5 },
  { type: 'style', section: '💄 代码样式', priority: 6 },
  { type: 'test', section: '✅ 测试', priority: 7 },
  { type: 'build', section: '📦 构建系统', priority: 8 },
  { type: 'ci', section: '👷 CI/CD', priority: 9 },
  { type: 'chore', section: '🔧 其他', priority: 10, hidden: true },
  { type: 'revert', section: '⏪ 回滚', priority: 11 },
] as const

/**
 * Breaking Change 关键词
 */
export const BREAKING_CHANGE_KEYWORDS = [
  'BREAKING CHANGE',
  'BREAKING-CHANGE',
  'BREAKING:',
] as const

// ============ Registry 配置 ============

/**
 * 内置 Registry 配置
 */
export const REGISTRY_PRESETS = {
  npm: {
    name: 'npm',
    url: 'https://registry.npmjs.org',
    description: 'NPM 官方 Registry',
  },
  yarn: {
    name: 'yarn',
    url: 'https://registry.yarnpkg.com',
    description: 'Yarn Registry (NPM 镜像)',
  },
  taobao: {
    name: 'taobao',
    url: 'https://registry.npmmirror.com',
    description: '淘宝 NPM 镜像',
  },
  tencent: {
    name: 'tencent',
    url: 'https://mirrors.cloud.tencent.com/npm/',
    description: '腾讯云 NPM 镜像',
  },
} as const

/**
 * 默认 Registry 超时配置
 */
export const REGISTRY_TIMEOUT = {
  /** 连接超时 (ms) */
  connect: 10000,
  
  /** 请求超时 (ms) */
  request: 60000,
  
  /** 发布超时 (ms) */
  publish: 120000,
} as const

// ============ 超时配置 ============

/**
 * 操作超时配置
 */
export const TIMEOUT_CONFIG = {
  /** Git 操作超时 (ms) */
  git: 30000,
  
  /** 构建超时 (ms) */
  build: 300000,
  
  /** 测试超时 (ms) */
  test: 300000,
  
  /** 钩子执行超时 (ms) */
  hook: 60000,
  
  /** 文件锁超时 (ms) */
  lock: 30000,
  
  /** 网络请求超时 (ms) */
  network: 60000,
} as const

// ============ 重试配置 ============

/**
 * 重试配置
 */
export const RETRY_CONFIG = {
  /** 最大重试次数 */
  maxRetries: 3,
  
  /** 初始延迟 (ms) */
  initialDelay: 1000,
  
  /** 最大延迟 (ms) */
  maxDelay: 30000,
  
  /** 退避因子 */
  backoffFactor: 2,
  
  /** 可重试的错误代码 */
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'ENOTFOUND',
    'E503',
    'E429',
  ] as const,
} as const

// ============ 缓存配置 ============

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  /** 默认 TTL (ms) - 5 分钟 */
  defaultTTL: 5 * 60 * 1000,
  
  /** 最大缓存条目 */
  maxSize: 1000,
  
  /** 清理间隔 (ms) - 1 分钟 */
  cleanupInterval: 60 * 1000,
  
  /** 版本信息缓存 TTL (ms) - 1 小时 */
  versionCacheTTL: 60 * 60 * 1000,
  
  /** Registry 信息缓存 TTL (ms) - 10 分钟 */
  registryCacheTTL: 10 * 60 * 1000,
} as const

// ============ 敏感信息模式 ============

/**
 * 敏感文件模式
 */
export const SENSITIVE_FILE_PATTERNS = [
  // 环境变量文件
  '.env',
  '.env.*',
  '*.env',
  
  // 密钥文件
  '*.pem',
  '*.key',
  '*.p12',
  '*.pfx',
  '*.keystore',
  
  // 配置文件
  '.npmrc',
  '.yarnrc',
  '.netrc',
  
  // 认证文件
  '**/credentials*',
  '**/secrets*',
  '**/auth*',
  
  // IDE 和编辑器
  '.idea/',
  '.vscode/settings.json',
  
  // 其他
  '*.log',
  'npm-debug.log',
] as const

/**
 * 敏感内容正则模式
 */
export const SENSITIVE_CONTENT_PATTERNS = [
  // API 密钥
  /(?:api[_-]?key|apikey)['\"]?\s*[:=]\s*['\"]?[\w-]{20,}/gi,
  
  // Token
  /(?:token|auth|bearer)['\"]?\s*[:=]\s*['\"]?[\w-]{20,}/gi,
  
  // 密码
  /(?:password|passwd|pwd|secret)['\"]?\s*[:=]\s*['\"][^'"]+['"]/gi,
  
  // AWS
  /AKIA[0-9A-Z]{16}/g,
  
  // Private Key
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/g,
  
  // NPM Token
  /npm_[a-zA-Z0-9]{36}/g,
  
  // GitHub Token
  /gh[pousr]_[A-Za-z0-9_]{36,}/g,
  
  // Generic Secret
  /['\"]?(?:secret|private)[_-]?(?:key|token)['\"]?\s*[:=]\s*['\"]?[^'"\s]{10,}/gi,
] as const

// ============ 版本配置 ============

/**
 * 版本类型优先级映射
 * 用于根据 commit 类型推断版本更新类型
 */
export const VERSION_BUMP_MAP = {
  // 主版本更新
  breaking: 'major',
  
  // 次版本更新
  feat: 'minor',
  
  // 补丁版本更新
  fix: 'patch',
  perf: 'patch',
  refactor: 'patch',
  
  // 不触发版本更新
  docs: null,
  style: null,
  test: null,
  build: null,
  ci: null,
  chore: null,
} as const

/**
 * 预发布标签类型
 */
export const PRERELEASE_TAGS = ['alpha', 'beta', 'rc', 'next', 'canary'] as const

// ============ 日志配置 ============

/**
 * 日志级别
 */
export const LOG_LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
  verbose: 5,
} as const

/**
 * 日志级别类型
 */
export type LogLevel = keyof typeof LOG_LEVELS

// ============ 包管理器检测 ============

/**
 * 包管理器锁文件映射
 */
export const PACKAGE_MANAGER_LOCK_FILES = {
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn',
  'package-lock.json': 'npm',
  'bun.lockb': 'bun',
} as const

/**
 * 工作空间配置文件
 */
export const WORKSPACE_CONFIG_FILES = {
  pnpm: 'pnpm-workspace.yaml',
  yarn: 'package.json', // workspaces 字段
  npm: 'package.json', // workspaces 字段
  lerna: 'lerna.json',
} as const
