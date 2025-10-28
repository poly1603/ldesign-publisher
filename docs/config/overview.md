# 配置概览

Publisher 提供了灵活而强大的配置系统，支持多种配置方式和丰富的配置选项。

## 配置文件

Publisher 支持多种配置文件格式：

- `publisher.config.ts` （推荐）
- `publisher.config.js`
- `publisher.config.mjs`
- `publisher.config.json`

## 快速生成配置

使用 `init` 命令快速生成配置：

```bash
# 交互式生成
ldesign-publisher init

# 使用模板
ldesign-publisher init --template monorepo

# 生成带注释的配置
ldesign-publisher init --commented
```

## 配置模板

Publisher 提供 5 个预设模板：

| 模板 | 说明 | 适用场景 |
|------|------|----------|
| **standard** | 标准发布配置 | 单包项目、开源项目 |
| **monorepo** | Monorepo 配置 | Monorepo 项目、Lerna 项目 |
| **beta** | Beta 版本配置 | 预发布、测试版本 |
| **hotfix** | 热修复配置 | 紧急修复、Patch 版本 |
| **minimal** | 最小化配置 | 简单项目、快速开始 |

## 基础配置示例

```typescript
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  // 版本策略
  versionStrategy: 'independent',
  
  // 发布配置
  publish: {
    access: 'public',
    tag: 'latest',
    confirm: true,
  },
  
  // Changelog 配置
  changelog: {
    enabled: true,
    conventional: true,
  },
  
  // Git 配置
  git: {
    createTag: true,
    pushTag: true,
  },
})
```

## 完整配置选项

### 基础配置

```typescript
{
  // 工作目录
  cwd?: string
  
  // 版本策略: fixed(统一版本) | independent(独立版本)
  versionStrategy?: 'fixed' | 'independent'
  
  // 并发数
  concurrency?: number
  
  // 调试模式
  debug?: boolean
  
  // 日志级别
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose'
}
```

### Registry 配置

```typescript
{
  // Registry 配置
  registries?: {
    [name: string]: {
      url: string
      token?: string
      access?: 'public' | 'restricted'
      scopes?: string[]
    }
  }
  
  // 默认 Registry
  defaultRegistry?: string
}
```

### 发布配置

```typescript
{
  publish?: {
    access?: 'public' | 'restricted'
    tag?: string
    otp?: boolean | string
    dryRun?: boolean
    skipBuild?: boolean
    skipTests?: boolean
    skipGitCheck?: boolean
    force?: boolean
    retries?: number
    retryDelay?: number
    parallel?: boolean
    confirm?: boolean
  }
}
```

### Changelog 配置

```typescript
{
  changelog?: {
    enabled?: boolean
    conventional?: boolean
    output?: string
    includeAuthors?: boolean
    includePRLinks?: boolean
  }
}
```

### 验证配置

```typescript
{
  validation?: {
    requireCleanWorkingDirectory?: boolean
    allowedBranches?: string[]
    requireTests?: boolean
    requireBuild?: boolean
    requireNpmCredentials?: boolean
    requiredFiles?: string[]
    maxPackageSize?: number
    scanSensitiveData?: boolean
    checkVersionConflict?: boolean
  }
}
```

### Git 配置

```typescript
{
  git?: {
    createTag?: boolean
    tagPrefix?: string
    tagMessage?: string
    pushTag?: boolean
    createCommit?: boolean
    commitMessage?: string
    pushCommit?: boolean
    remote?: string
    signCommit?: boolean
    signTag?: boolean
  }
}
```

### Monorepo 配置

```typescript
{
  monorepo?: {
    packages?: string[]
    useWorkspaces?: boolean
    workspaceProtocol?: 'pnpm' | 'yarn' | 'npm'
    updateWorkspaceDependencies?: boolean
    filter?: string | string[]
    ignorePrivate?: boolean
    topologicalSort?: boolean
    publishOrder?: 'parallel' | 'serial' | 'auto'
  }
}
```

### 钩子配置

```typescript
{
  hooks?: {
    prePublish?: string | string[] | (() => Promise<void>)
    postPublish?: string | string[] | ((result: any) => Promise<void>)
    preVersion?: string | string[] | (() => Promise<void>)
    postVersion?: string | string[] | ((version: string) => Promise<void>)
    preChangelog?: string | string[] | (() => Promise<void>)
    postChangelog?: string | string[] | ((changelog: string) => Promise<void>)
  }
}
```

### 通知配置

```typescript
{
  notifications?: {
    enabled?: boolean
    channels?: Array<{
      type: 'dingtalk' | 'wecom' | 'slack' | 'email' | 'webhook'
      name?: string
      when?: ('success' | 'failure' | 'always')[]
      enabled?: boolean
      config: any
    }>
    defaultTriggers?: ('success' | 'failure' | 'always')[]
    includeDetails?: boolean
    timeout?: number
    retries?: number
  }
}
```

## 配置优先级

配置加载顺序（后面的覆盖前面的）：

1. 默认配置
2. 配置文件
3. CLI 参数
4. 环境变量

## 环境变量

支持通过环境变量覆盖配置：

```bash
# Registry Token
NPM_TOKEN=xxx

# 通知 Webhook
DINGTALK_WEBHOOK=xxx
WECOM_WEBHOOK=xxx
SLACK_WEBHOOK=xxx
```

## 类型安全

使用 TypeScript 获得完整的类型提示：

```typescript
import { defineConfig } from '@ldesign/publisher'
import type { PublisherConfig } from '@ldesign/publisher'

// 方式 1: 使用 defineConfig
export default defineConfig({
  // 完整的类型提示
})

// 方式 2: 使用类型注解
const config: PublisherConfig = {
  // 完整的类型提示
}

export default config
```

## 配置验证

Publisher 会自动验证配置，并提供详细的错误提示：

```bash
ldesign-publisher doctor
```

## 配置示例

查看更多配置示例：

- [标准配置示例](/config/examples#standard)
- [Monorepo 配置示例](/config/examples#monorepo)
- [完整配置示例](/config/examples#complete)

## 下一步

- 查看[配置模板](/config/templates)了解预设模板
- 查看[配置示例](/config/examples)获取完整示例
- 查看各个配置选项的详细说明：
  - [发布配置](/config/publish)
  - [Registry 配置](/config/registry)
  - [Git 配置](/config/git)
  - [Monorepo 配置](/config/monorepo)
  - [验证配置](/config/validation)
  - [钩子配置](/config/hooks)
  - [通知配置](/config/notifications)
