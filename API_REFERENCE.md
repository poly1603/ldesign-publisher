# API 参考文档

## 📚 目录

- [核心 API](#核心-api)
- [验证器 API](#验证器-api)
- [工具函数 API](#工具函数-api)
- [类型定义](#类型定义)

---

## 核心 API

### PublishManager

发布管理器，协调整个发布流程。

#### 创建实例

```typescript
import { createPublishManager } from '@ldesign/publisher'

const manager = createPublishManager({
  versionStrategy: 'independent',
  registries: { /* ... */ },
  hooks: { /* ... */ }
})
```

#### 方法

##### `publish(): Promise<PublishReport>`

执行完整的发布流程。

**返回**: 发布报告

**示例**:
```typescript
const report = await manager.publish()
console.log(report.summary)
```

---

### VersionManager

版本号管理器。

#### 创建实例

```typescript
import { createVersionManager } from '@ldesign/publisher'

const versionManager = createVersionManager({
  cwd: '/path/to/package'
})
```

#### 方法

##### `getCurrentVersion(): Promise<string>`

获取当前版本号。

##### `updateVersion(options): Promise<VersionInfo>`

更新版本号。

**参数**:
- `options.type`: 版本类型（'major' | 'minor' | 'patch' | 'prerelease'）
- `options.version`: 指定的版本号
- `options.preid`: 预发布标识符

**示例**:
```typescript
const info = await versionManager.updateVersion({ type: 'patch' })
// info.newVersion = '1.0.1'
```

##### `getRecommendedVersion(preset?): Promise<VersionRecommendation>`

基于 Conventional Commits 获取推荐版本。

##### `compareVersions(v1, v2): number`

比较两个版本号。

**返回**: -1 (v1 < v2), 0 (v1 = v2), 1 (v1 > v2)

##### `isValidVersion(version): boolean`

验证版本号是否符合 Semver 规范。

##### `isPreRelease(version): boolean`

检查是否为预发布版本。

---

### ChangelogGenerator

Changelog 生成器。

#### 创建实例

```typescript
import { createChangelogGenerator } from '@ldesign/publisher'

const generator = createChangelogGenerator({
  cwd: '/path/to/package',
  packageName: '@scope/package',
  options: {
    output: 'CHANGELOG.md',
    includeAuthors: true
  }
})
```

#### 方法

##### `generate(version, from?, to?): Promise<ChangelogContent>`

生成 Changelog 内容。

**参数**:
- `version`: 目标版本号
- `from`: 起始 tag（可选）
- `to`: 结束 tag（默认 'HEAD'）

##### `generateAndWrite(version, from?, to?): Promise<void>`

生成并写入 Changelog 文件。

---

### RegistryManager

Registry 管理器。

#### 创建实例

```typescript
import { createRegistryManager } from '@ldesign/publisher'

const registryManager = createRegistryManager({
  registries: {
    npm: { url: 'https://registry.npmjs.org' },
    private: { url: 'https://npm.company.com' }
  },
  defaultRegistry: 'npm'
})
```

#### 方法

##### `addRegistry(name, config): void`

添加 Registry。

##### `getRegistry(name?): RegistryConfig`

获取 Registry 配置。

##### `selectRegistryForPackage(packageName): RegistryConfig`

为包选择合适的 Registry（基于 scope）。

##### `validateRegistry(name?): Promise<boolean>`

验证 Registry 连接。

##### `checkAuth(name?): Promise<string | null>`

检查认证状态。

---

### HookManager 🆕

钩子管理器。

#### 创建实例

```typescript
import { createHookManager } from '@ldesign/publisher'

const hookManager = createHookManager({
  prePublish: async () => {
    console.log('准备发布...')
  },
  postPublish: 'echo "发布完成"'
})
```

#### 方法

##### `executeHook(hookName, context?): Promise<HookExecutionResult[]>`

执行指定的钩子。

**参数**:
- `hookName`: 钩子名称
- `context`: 传递给钩子的上下文数据

##### `hasHook(hookName): boolean`

检查钩子是否存在。

##### `getExecutionHistory(hookName?): HookExecutionResult[]`

获取钩子执行历史。

##### `generateReport(): string`

生成钩子执行报告。

---

### PublishAnalytics 🆕

发布统计分析。

#### 创建实例

```typescript
import { createPublishAnalytics } from '@ldesign/publisher'

const analytics = createPublishAnalytics()
```

#### 方法

##### `recordPublish(report): Promise<void>`

记录发布信息。

##### `getStatistics(): Promise<PublishStatistics>`

获取统计数据。

**返回**:
```typescript
{
  totalPublishes: number
  successfulPublishes: number
  failedPublishes: number
  successRate: number
  averageDuration: number
  totalPackages: number
  lastPublish?: PublishRecord
  fastestPublish?: PublishRecord
  slowestPublish?: PublishRecord
  byDate: Record<string, number>
  byMonth: Record<string, number>
}
```

##### `getRecentPublishes(limit?): Promise<PublishRecord[]>`

获取最近的发布记录。

##### `generateReport(): Promise<string>`

生成统计报告。

---

### DependencyResolver

依赖解析器。

#### 方法

##### `initialize(): Promise<void>`

初始化工作空间信息。

##### `getAllPackages(options?): PackageInfo[]`

获取所有包。

##### `getTopologicalOrder(options?): string[]`

获取拓扑排序后的包列表。

##### `detectCircularDependencies(options?): string[][]`

检测循环依赖。

##### `getPackageDependencies(packageName): Set<string>`

获取包的依赖。

##### `getPackageDependents(packageName): Set<string>`

获取包的被依赖（反向依赖）。

---

## 验证器 API

### ConfigValidator 🆕

配置验证器。

```typescript
import { createConfigValidator } from '@ldesign/publisher'

const validator = createConfigValidator()
const result = validator.validate(config)

if (!result.valid) {
  console.error(result.errors)
}
```

#### 方法

- `validate(config): ValidationResult`
- `validateOrThrow(config): void`
- `generateDefaultConfig(): PublisherConfig`

### PackageValidator

包验证器。

```typescript
import { PackageValidator } from '@ldesign/publisher'

const validator = new PackageValidator({
  requiredFiles: ['README.md', 'LICENSE'],
  maxPackageSize: 10 * 1024 * 1024,
  scanSensitiveData: true
})

const result = await validator.validate(packageInfo)
```

### GitValidator

Git 验证器。

```typescript
import { GitValidator } from '@ldesign/publisher'

const validator = new GitValidator({
  requireCleanWorkingDirectory: true,
  allowedBranches: ['main', 'master']
})

const result = await validator.validate()
```

---

## 工具函数 API

### MemoryCache 🆕

内存缓存工具。

```typescript
import { MemoryCache, getGlobalCache } from '@ldesign/publisher'

const cache = new MemoryCache({
  ttl: 60000,      // 1 分钟
  maxSize: 1000,   // 最多 1000 项
  autoCleanup: true
})

cache.set('key', 'value')
const value = cache.get('key')

const stats = cache.getStats()
// { hits, misses, hitRate, size, maxSize }
```

#### 方法

- `set(key, value, ttl?): void`
- `get(key): T | undefined`
- `has(key): boolean`
- `delete(key): boolean`
- `clear(): void`
- `getStats(): CacheStats`
- `cleanup(): number`

### Logger

日志工具。

```typescript
import { logger } from '@ldesign/publisher'

logger.info('信息')
logger.success('成功')
logger.warn('警告')
logger.error('错误')
logger.debug('调试')

logger.setLevel('debug')
const spinner = logger.startSpinner('处理中...')
logger.succeedSpinner('完成')
```

### Git 工具

```typescript
import { createGitUtils } from '@ldesign/publisher'

const gitUtils = createGitUtils({ cwd: '/path' })

const isRepo = await gitUtils.isGitRepository()
const isClean = await gitUtils.isWorkingDirectoryClean()
const branch = await gitUtils.getCurrentBranch()
const commits = await gitUtils.getCommits('v1.0.0', 'HEAD')
```

### NPM 客户端

```typescript
import { createNpmClient } from '@ldesign/publisher'

const client = createNpmClient({
  registry: 'https://registry.npmjs.org',
  token: 'xxx'
})

await client.publish()
await client.unpublish('package', '1.0.0')
const exists = await client.packageExists('package')
```

---

## 类型定义

### PublisherConfig

完整的配置类型。

```typescript
interface PublisherConfig {
  cwd?: string
  versionStrategy?: 'fixed' | 'independent'
  registries?: Record<string, RegistryConfig>
  defaultRegistry?: string
  publish?: PublishOptions
  changelog?: ChangelogOptions
  validation?: ValidationOptions
  hooks?: LifecycleHooks
  git?: GitOptions
  monorepo?: MonorepoOptions
  concurrency?: number
  debug?: boolean
  logLevel?: LogLevel
}
```

### LifecycleHooks 🆕

生命周期钩子配置。

```typescript
interface LifecycleHooks {
  prePublish?: string | string[] | (() => Promise<void>)
  postPublish?: string | string[] | ((result: any) => Promise<void>)
  preVersion?: string | string[] | (() => Promise<void>)
  postVersion?: string | string[] | ((version: string) => Promise<void>)
  preChangelog?: string | string[] | (() => Promise<void>)
  postChangelog?: string | string[] | ((changelog: string) => Promise<void>)
  preValidate?: string | string[] | (() => Promise<void>)
  postValidate?: string | string[] | ((result: ValidationResult) => Promise<void>)
}
```

### PublishReport

发布报告类型。

```typescript
interface PublishReport {
  success: boolean
  published: PublishResult[]
  failed: PublishResult[]
  skipped: string[]
  duration: number
  errors: PublishError[]
  warnings: PublishWarning[]
  summary: string
}
```

---

## 🔧 便捷函数

### defineConfig

提供类型安全的配置定义。

```typescript
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  versionStrategy: 'independent',
  // 完整的类型提示...
})
```

---

## 🎯 使用示例

### 完整发布流程

```typescript
import { createPublishManager, defineConfig } from '@ldesign/publisher'

const config = defineConfig({
  versionStrategy: 'independent',
  
  registries: {
    npm: {
      url: 'https://registry.npmjs.org',
      access: 'public'
    }
  },
  
  hooks: {
    prePublish: async () => {
      // 运行测试
      await runTests()
    },
    postPublish: async (report) => {
      // 发送通知
      await sendNotification(report)
    }
  },
  
  validation: {
    requireCleanWorkingDirectory: true,
    scanSensitiveData: true
  },
  
  git: {
    createTag: true,
    createCommit: true,
    pushTag: true
  }
})

const manager = createPublishManager(config)
const report = await manager.publish()

console.log(report.summary)
```

### 版本管理

```typescript
import { createVersionManager } from '@ldesign/publisher'

const versionManager = createVersionManager()

// 获取推荐版本
const recommendation = await versionManager.getRecommendedVersion()
console.log(`推荐版本: ${recommendation.version}`)

// 更新版本
const info = await versionManager.updateVersion({
  type: 'patch'
})
```

### Changelog 生成

```typescript
import { createChangelogGenerator } from '@ldesign/publisher'

const generator = createChangelogGenerator({
  options: {
    includeAuthors: true,
    includePRLinks: true
  }
})

await generator.generateAndWrite('1.0.0')
```

### 发布统计

```typescript
import { createPublishAnalytics } from '@ldesign/publisher'

const analytics = createPublishAnalytics()

// 获取统计
const stats = await analytics.getStatistics()
console.log(`成功率: ${stats.successRate}%`)

// 打印报告
await analytics.printReport()
```

---

**版本**: 1.2.0  
**最后更新**: 2025-10-25

