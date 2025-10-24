/**
 * Publisher 配置模板
 */

import type { PublisherConfig } from '@ldesign/publisher'

export default {
  // 版本策略
  versionStrategy: 'independent', // 'fixed' | 'independent'

  // Registry 配置
  registries: {
    public: {
      url: 'https://registry.npmjs.org',
      access: 'public',
    },
    private: {
      url: 'https://npm.example.com',
      token: process.env.NPM_TOKEN,
      scopes: ['@mycompany'],
    },
  },

  // 默认 registry
  defaultRegistry: 'public',

  // 发布选项
  publish: {
    access: 'public',
    tag: 'latest',
    otp: false,
    dryRun: false,
    parallel: true,
    confirm: true,
  },

  // Changelog 配置
  changelog: {
    enabled: true,
    conventional: true,
    output: 'CHANGELOG.md',
    includeAuthors: true,
    includePRLinks: true,
    includeCommitHash: true,
  },

  // 验证规则
  validation: {
    requireCleanWorkingDirectory: true,
    allowedBranches: ['main', 'master'],
    requireTests: true,
    requireBuild: true,
    scanSensitiveData: true,
    maxPackageSize: 10 * 1024 * 1024, // 10MB
  },

  // Git 配置
  git: {
    createTag: true,
    tagPrefix: 'v',
    createCommit: true,
    commitMessage: 'chore(release): publish {version}',
    pushTag: true,
    pushCommit: true,
  },

  // Monorepo 配置
  monorepo: {
    useWorkspaces: true,
    workspaceProtocol: 'pnpm',
    updateWorkspaceDependencies: true,
    ignorePrivate: true,
    topologicalSort: true,
    publishOrder: 'serial', // 'parallel' | 'serial' | 'auto'
  },

  // 并发配置
  concurrency: 4,

  // 调试模式
  debug: false,

  // 日志级别
  logLevel: 'info', // 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose'
} satisfies PublisherConfig

