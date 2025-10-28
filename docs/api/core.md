# 核心 API

Publisher 提供了丰富的 API，既可以通过 CLI 使用，也可以在代码中直接调用。

## 导入方式

```typescript
// 导入所有核心 API
import {
  createPublishManager,
  createVersionManager,
  createChangelogGenerator,
  createNotificationManager,
  createRegistryManager,
  defineConfig,
} from '@ldesign/publisher'

// 导入类型
import type { PublisherConfig, PublishReport } from '@ldesign/publisher'
```

## 工厂函数

Publisher 使用工厂模式创建管理器实例。

### createPublishManager()

创建发布管理器，协调整个发布流程。

```typescript
function createPublishManager(config?: PublisherConfig): PublishManager
```

**参数**：
- `config` - 配置对象（可选）

**返回**：
- `PublishManager` 实例

**示例**：

```typescript
import { createPublishManager } from '@ldesign/publisher'

const manager = createPublishManager({
  versionStrategy: 'independent',
  publish: {
    tag: 'latest',
    confirm: false,
  },
})

// 执行发布
const report = await manager.publish()
console.log(report.summary)
```

---

### createVersionManager()

创建版本管理器。

```typescript
function createVersionManager(config?: VersionManagerConfig): VersionManager
```

**示例**：

```typescript
import { createVersionManager } from '@ldesign/publisher'

const versionManager = createVersionManager()

// 获取当前版本
const current = await versionManager.getCurrentVersion()

// 更新版本
const info = await versionManager.updateVersion({
  type: 'patch',
})

// 获取推荐版本
const recommendation = await versionManager.getRecommendedVersion()
```

---

### createChangelogGenerator()

创建 Changelog 生成器。

```typescript
function createChangelogGenerator(config?: ChangelogConfig): ChangelogGenerator
```

**示例**：

```typescript
import { createChangelogGenerator } from '@ldesign/publisher'

const generator = createChangelogGenerator({
  packageName: '@mycompany/core',
  options: {
    includeAuthors: true,
    includePRLinks: true,
  },
})

// 生成 Changelog
const changelog = await generator.generate('1.0.0')

// 生成并写入文件
await generator.generateAndWrite('1.0.0')
```

---

### createNotificationManager()

创建通知管理器。

```typescript
function createNotificationManager(config?: NotificationConfig): NotificationManager
```

**示例**：

```typescript
import { createNotificationManager } from '@ldesign/publisher'

const notificationManager = createNotificationManager({
  enabled: true,
  channels: [
    {
      type: 'dingtalk',
      config: {
        webhook: process.env.DINGTALK_WEBHOOK,
      },
    },
  ],
})

// 发送发布通知
await notificationManager.sendPublishNotification(report)

// 发送自定义通知
await notificationManager.send({
  type: 'info',
  title: '自定义通知',
  content: '通知内容',
})
```

---

### createRegistryManager()

创建 Registry 管理器。

```typescript
function createRegistryManager(config?: RegistryConfig): RegistryManager
```

**示例**：

```typescript
import { createRegistryManager } from '@ldesign/publisher'

const registryManager = createRegistryManager({
  registries: {
    npm: {
      url: 'https://registry.npmjs.org',
    },
    private: {
      url: 'https://npm.example.com',
      token: process.env.NPM_TOKEN,
    },
  },
  defaultRegistry: 'npm',
})

// 添加 Registry
registryManager.addRegistry('custom', {
  url: 'https://custom.npm.com',
})

// 选择 Registry
const registry = registryManager.selectRegistryForPackage('@mycompany/core')

// 验证 Registry
const isValid = await registryManager.validateRegistry('npm')
```

---

## 辅助函数

### defineConfig()

提供类型安全的配置定义。

```typescript
function defineConfig(config: PublisherConfig): PublisherConfig
```

**示例**：

```typescript
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  versionStrategy: 'independent',
  publish: {
    access: 'public',
  },
  // TypeScript 会提供完整的类型提示
})
```

---

## 完整示例

### 自定义发布流程

```typescript
import {
  createPublishManager,
  createVersionManager,
  createChangelogGenerator,
  createNotificationManager,
} from '@ldesign/publisher'

async function customPublish() {
  // 1. 版本管理
  const versionManager = createVersionManager()
  const recommendation = await versionManager.getRecommendedVersion()
  
  console.log(`推荐版本: ${recommendation.version}`)
  console.log(`原因: ${recommendation.reason}`)
  
  await versionManager.updateVersion({
    type: recommendation.releaseType,
  })
  
  // 2. 生成 Changelog
  const changelogGenerator = createChangelogGenerator()
  await changelogGenerator.generateAndWrite(recommendation.version)
  
  // 3. 发布
  const publishManager = createPublishManager({
    publish: {
      confirm: false,
      dryRun: false,
    },
  })
  
  const report = await publishManager.publish()
  
  // 4. 发送通知
  const notificationManager = createNotificationManager({
    enabled: true,
    channels: [
      {
        type: 'dingtalk',
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
        },
      },
    ],
  })
  
  await notificationManager.sendPublishNotification(report)
  
  // 5. 输出报告
  console.log(report.summary)
  
  return report
}

// 执行
customPublish().catch(console.error)
```

### 批量发布 Monorepo

```typescript
import { createPublishManager, createDependencyResolver } from '@ldesign/publisher'

async function publishMonorepo() {
  // 1. 解析依赖
  const resolver = createDependencyResolver()
  await resolver.initialize()
  
  const packages = resolver.getAllPackages()
  const order = resolver.getTopologicalOrder()
  
  console.log('发布顺序:', order)
  
  // 2. 检测循环依赖
  const cycles = resolver.detectCircularDependencies()
  if (cycles.length > 0) {
    console.error('检测到循环依赖:', cycles)
    return
  }
  
  // 3. 批量发布
  const manager = createPublishManager({
    monorepo: {
      useWorkspaces: true,
      topologicalSort: true,
    },
    publish: {
      parallel: true,
    },
    concurrency: 4,
  })
  
  const report = await manager.publish()
  
  console.log(`成功: ${report.published.length}`)
  console.log(`失败: ${report.failed.length}`)
  
  return report
}

publishMonorepo().catch(console.error)
```

### 使用钩子

```typescript
import { createPublishManager } from '@ldesign/publisher'

const manager = createPublishManager({
  hooks: {
    // 发布前钩子
    prePublish: async () => {
      console.log('开始发布前检查...')
      // 运行测试
      await runTests()
      // 运行 lint
      await runLint()
    },
    
    // 发布后钩子
    postPublish: async (report) => {
      console.log('发布完成！')
      
      // 发送自定义通知
      await sendSlackMessage(report)
      
      // 更新文档
      await updateDocs()
      
      // 创建 GitHub Release
      await createGitHubRelease(report)
    },
    
    // 版本更新后钩子
    postVersion: async (version) => {
      console.log(`版本已更新到: ${version}`)
    },
  },
})

await manager.publish()
```

## 错误处理

```typescript
import { 
  createPublishManager,
  PublishError,
  ValidationError,
  RegistryError,
} from '@ldesign/publisher'

try {
  const manager = createPublishManager()
  const report = await manager.publish()
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('验证失败:', error.message)
    console.error('详情:', error.details)
  } else if (error instanceof RegistryError) {
    console.error('Registry 错误:', error.message)
  } else if (error instanceof PublishError) {
    console.error('发布失败:', error.message)
  } else {
    console.error('未知错误:', error)
  }
  
  process.exit(1)
}
```

## TypeScript 支持

Publisher 提供完整的 TypeScript 类型定义：

```typescript
import type {
  PublisherConfig,
  PublishReport,
  PublishResult,
  VersionInfo,
  ChangelogContent,
  NotificationReport,
  RegistryConfig,
  PackageInfo,
  ValidationResult,
} from '@ldesign/publisher'

// 类型安全的配置
const config: PublisherConfig = {
  versionStrategy: 'independent',
  // 完整的类型提示
}

// 类型安全的结果处理
const handleReport = (report: PublishReport) => {
  report.published.forEach((pkg: PublishResult) => {
    console.log(`${pkg.name}@${pkg.version}`)
  })
}
```

## 下一步

- 查看 [PublishManager API](/api/publish-manager) 详细文档
- 查看 [VersionManager API](/api/version-manager) 详细文档
- 查看 [NotificationManager API](/api/notification-manager) 详细文档
- 查看[类型定义](/api/types-config)
