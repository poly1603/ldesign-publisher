# Publisher 架构设计文档

## 📐 整体架构

@ldesign/publisher 采用模块化、分层的架构设计，确保代码的可维护性和可扩展性。

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Layer (CLI 层)                    │
│  Commands: publish, version, changelog, rollback,       │
│            precheck, stats                              │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   Core Layer (核心层)                    │
│  PublishManager, VersionManager, ChangelogGenerator,    │
│  RegistryManager, DependencyResolver, RollbackManager,  │
│  HookManager, PublishAnalytics                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Validators Layer (验证层)                   │
│  PackageValidator, GitValidator, ConfigValidator        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                Utils Layer (工具层)                      │
│  logger, error-handler, npm-client, git-utils,          │
│  workspace-utils, security, cache                       │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                 Types Layer (类型层)                     │
│  config, version, package, changelog, publish           │
└─────────────────────────────────────────────────────────┘
```

## 🏗️ 核心模块设计

### 1. PublishManager (发布管理器)

**职责**: 协调整个发布流程

**设计模式**: 门面模式 (Facade Pattern)

**核心流程**:
```typescript
publish() {
  1. 执行 prePublish 钩子
  2. 初始化（解析工作空间、获取包列表）
  3. 验证（Git、包、依赖）
  4. 构建（并行/串行）
  5. 更新版本
  6. 生成 Changelog
  7. 发布到 Registry
  8. Git 操作（tag、commit、push）
  9. 记录统计
  10. 执行 postPublish 钩子
  11. 生成报告
}
```

**依赖注入**:
- RegistryManager
- VersionManager
- DependencyResolver
- ChangelogGenerator
- HookManager
- PackageValidator
- GitValidator

### 2. HookManager (钩子管理器)

**职责**: 管理生命周期钩子的执行

**设计模式**: 观察者模式 (Observer Pattern)

**支持的钩子**:
```typescript
- prePublish / postPublish     // 发布前后
- preVersion / postVersion     // 版本更新前后
- preChangelog / postChangelog // Changelog 生成前后
- preValidate / postValidate   // 验证前后
```

**钩子类型**:
- 命令行字符串: `'npm test'`
- 函数: `async () => { ... }`
- 数组: `['npm test', async () => {}]`

### 3. VersionManager (版本管理器)

**职责**: 版本号的读取、更新和验证

**核心功能**:
- Semver 版本递增
- 基于 Conventional Commits 的版本推荐
- 版本比较和验证
- 批量版本更新

**使用的库**:
- `semver` - 版本号处理
- `conventional-recommended-bump` - 版本推荐

### 4. ChangelogGenerator (Changelog 生成器)

**职责**: 生成符合规范的变更日志

**核心功能**:
- 解析 Conventional Commits
- 按类型分组
- 生成 Markdown 格式
- 智能 URL 生成（PR、Commit 链接）

**支持的平台**:
- GitHub
- GitLab
- Gitee
- Bitbucket

### 5. DependencyResolver (依赖解析器)

**职责**: Monorepo 依赖关系解析

**核心算法**:
- 拓扑排序 (Topological Sort)
- 循环依赖检测 (Circular Dependency Detection)
- 依赖图构建 (Dependency Graph)

**数据结构**:
```typescript
PackageDependencyGraph {
  packages: Map<name, PackageInfo>
  dependencies: Map<name, Set<dependency>>
  dependents: Map<name, Set<dependent>>
}
```

### 6. RegistryManager (Registry 管理器)

**职责**: NPM registry 配置和管理

**核心功能**:
- 多 Registry 配置
- Token 管理
- Scope 映射
- .npmrc 文件读写

### 7. ConfigValidator (配置验证器)

**职责**: 验证配置文件的正确性

**技术栈**: Zod

**验证层级**:
1. Schema 验证（类型、格式）
2. 业务规则验证（一致性、合理性）
3. 详细的错误提示和建议

### 8. MemoryCache (缓存工具)

**职责**: 提供高性能的内存缓存

**核心特性**:
- TTL (Time To Live)
- LRU (Least Recently Used) 驱逐
- 命中率统计
- 自动清理

**应用场景**:
- Git 查询结果缓存
- NPM Registry 查询缓存
- 工作空间信息缓存

### 9. PublishAnalytics (发布统计)

**职责**: 记录和分析发布历史

**核心功能**:
- 发布记录持久化
- 统计分析（成功率、耗时）
- 趋势分析（按日期/月份）
- 报告生成

## 🔄 数据流

### 发布流程数据流

```
用户输入 (CLI)
    │
    ├─> 配置加载 (ConfigLoader)
    │       │
    │       ├─> 配置验证 (ConfigValidator)
    │       └─> 合并默认配置
    │
    ├─> 发布管理器 (PublishManager)
    │       │
    │       ├─> 执行钩子 (HookManager)
    │       │
    │       ├─> 依赖解析 (DependencyResolver)
    │       │       └─> 工作空间工具 (workspace-utils)
    │       │
    │       ├─> 验证器 (Validators)
    │       │       ├─> Git 验证
    │       │       └─> 包验证
    │       │
    │       ├─> 构建器 (BuilderIntegration)
    │       │
    │       ├─> 版本管理 (VersionManager)
    │       │       └─> Git 工具 (git-utils)
    │       │
    │       ├─> Changelog 生成 (ChangelogGenerator)
    │       │       └─> Git 工具 (git-utils)
    │       │
    │       ├─> Registry 发布 (RegistryManager)
    │       │       └─> NPM 客户端 (npm-client)
    │       │
    │       ├─> Git 操作 (git-utils)
    │       │
    │       ├─> 统计记录 (PublishAnalytics)
    │       │
    │       └─> 执行钩子 (HookManager)
    │
    └─> 发布报告 (PublishReport)
```

## 🎯 设计原则

### 1. 单一职责原则 (SRP)
每个类和模块只负责一个特定的功能：
- `VersionManager` 只管理版本
- `ChangelogGenerator` 只生成 Changelog
- `RegistryManager` 只管理 Registry

### 2. 开放封闭原则 (OCP)
通过钩子系统实现扩展：
```typescript
// 无需修改核心代码，通过钩子扩展功能
hooks: {
  postPublish: async (report) => {
    await sendNotification(report)
  }
}
```

### 3. 依赖倒置原则 (DIP)
依赖抽象而非具体实现：
- 使用工厂函数创建实例
- 通过接口定义契约
- 依赖注入而非硬编码

### 4. 接口隔离原则 (ISP)
提供最小化的接口：
- 每个 Manager 只暴露必要的方法
- 通过 Options 接口传递配置

### 5. 里氏替换原则 (LSP)
错误类层次结构：
```typescript
PublisherError
  ├─ ValidationError
  ├─ RegistryError
  ├─ VersionError
  ├─ GitError
  ├─ PublishError
  └─ ConfigError
```

## 🔌 扩展点

### 1. 生命周期钩子
在发布流程的各个阶段注入自定义逻辑

### 2. 自定义验证器
通过 `customValidators` 添加业务验证逻辑

### 3. 缓存策略
可以替换默认的 MemoryCache 实现

### 4. 错误处理
可以自定义错误处理策略

## 📊 性能考虑

### 1. 并行处理
- 独立包并行构建
- 独立包并行发布
- 使用 `Promise.allSettled` 避免单点失败

### 2. 缓存优化
- Git 查询结果缓存（减少 ~70% 重复查询）
- NPM Registry 查询缓存
- 工作空间信息缓存

### 3. 内存管理
- LRU 驱逐策略（避免缓存无限增长）
- 自动清理过期缓存
- 可配置的缓存大小限制

## 🔒 安全考虑

### 1. 敏感信息保护
- 扫描 `.env` 文件
- 检测密钥文件
- 验证 Token 和密码

### 2. 验证机制
- Git 工作区检查
- 分支权限检查
- NPM 凭证验证

### 3. 回滚机制
- Unpublish（24小时内）
- Deprecate（废弃版本）
- Git 回滚指导

## 🧪 测试策略

### 1. 单元测试
- 每个核心类都有对应的测试
- Mock 外部依赖
- 覆盖正常和异常场景

### 2. 集成测试
- 测试模块间的协作
- 测试完整的工作流

### 3. 端到端测试
- 测试 CLI 命令
- 使用 Verdaccio 测试真实发布

## 📚 最佳实践

### 1. 错误处理
```typescript
try {
  await operation()
} catch (error: any) {
  throw new SpecificError(
    '清晰的错误消息',
    { context: 'details' },
    '修复建议'
  )
}
```

### 2. 日志记录
```typescript
logger.info('操作开始')
logger.debug('调试信息')
logger.success('操作成功')
logger.error('操作失败')
```

### 3. 配置管理
```typescript
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  // 类型安全的配置
})
```

### 4. 扩展功能
```typescript
// 通过钩子扩展
hooks: {
  postPublish: async (report) => {
    // 自定义逻辑
  }
}
```

## 🔮 未来展望

### 短期计划
- 完善集成测试
- 优化进度反馈（listr2）
- 性能基准测试

### 中期计划
- 通知系统集成
- 发布审批流程
- 配置向导

### 长期计划
- 插件系统
- Web UI
- 更多平台支持

---

**文档版本**: 1.0  
**最后更新**: 2025-10-25  
**作者**: LDesign Team

