# 初始化配置

`init` 命令是开始使用 Publisher 的第一步，它提供了交互式向导来生成配置文件。

## 基础使用

### 交互式初始化

```bash
ldesign-publisher init
```

这将启动交互式向导，引导你完成配置：

1. 选择配置方式（使用模板 or 带注释的配置）
2. 如果选择模板，选择适合的模板
3. 查看模板的适用场景说明
4. 确认并生成配置文件

### 使用模板

直接使用指定的模板：

```bash
# 使用 standard 模板
ldesign-publisher init --template standard

# 使用 monorepo 模板
ldesign-publisher init --template monorepo

# 使用 beta 模板
ldesign-publisher init --template beta

# 使用 hotfix 模板
ldesign-publisher init --template hotfix

# 使用 minimal 模板
ldesign-publisher init --template minimal
```

### 生成带注释的配置

```bash
ldesign-publisher init --commented
```

这将生成一个包含所有配置选项注释的配置文件，适合需要自定义配置的场景。

## 命令选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `-t, --template <name>` | 使用指定模板 | `--template monorepo` |
| `-f, --format <format>` | 配置文件格式（ts\|js） | `--format js` |
| `-o, --output <file>` | 输出文件名 | `--output my-config.ts` |
| `--force` | 覆盖已存在的文件 | `--force` |
| `--commented` | 生成带注释的配置 | `--commented` |

## 配置模板详解

### 1. Standard（标准）

**适用场景**：
- 单包项目
- 开源项目
- 通用场景

**特点**：
- 完整的验证检查
- 自动生成 Changelog
- Git tag 和 commit
- 测试和构建要求

**配置要点**：
```typescript
{
  versionStrategy: 'independent',
  validation: {
    requireCleanWorkingDirectory: true,
    requireTests: true,
    requireBuild: true,
  },
  hooks: {
    prePublish: 'npm test',
  },
}
```

### 2. Monorepo

**适用场景**：
- Monorepo 项目
- Lerna 项目
- pnpm workspace

**特点**：
- 启用并行发布
- 拓扑排序
- 工作空间依赖更新
- 循环依赖检测

**配置要点**：
```typescript
{
  monorepo: {
    useWorkspaces: true,
    topologicalSort: true,
    publishOrder: 'auto',
  },
  publish: {
    parallel: true,
  },
  concurrency: 4,
}
```

### 3. Beta（测试版）

**适用场景**：
- Beta 版本发布
- 预发布测试
- 开发分支发布

**特点**：
- 使用 beta tag
- 放宽验证要求
- 不生成 Changelog
- 不推送 Git tag

**配置要点**：
```typescript
{
  publish: {
    tag: 'beta',
    confirm: false,
  },
  changelog: {
    enabled: false,
  },
  validation: {
    requireCleanWorkingDirectory: false,
    requireTests: false,
  },
}
```

### 4. Hotfix（热修复）

**适用场景**：
- 紧急修复
- 线上问题
- Patch 版本

**特点**：
- 串行发布（更安全）
- 必须测试
- 完整的 Git 操作
- 发布后提醒

**配置要点**：
```typescript
{
  publish: {
    parallel: false,
    retries: 3,
  },
  validation: {
    requireTests: true,
    allowedBranches: ['hotfix', 'main'],
  },
  hooks: {
    postPublish: async () => {
      console.log('⚠️  热修复已发布，请及时通知相关人员')
    },
  },
}
```

### 5. Minimal（最小化）

**适用场景**：
- 简单项目
- 快速开始
- 自定义配置基础

**特点**：
- 最少的配置选项
- 仅包含必需配置
- 易于理解和扩展

**配置要点**：
```typescript
{
  versionStrategy: 'independent',
  publish: {
    access: 'public',
    tag: 'latest',
  },
}
```

## 配置文件格式

### TypeScript 格式（推荐）

```typescript
// publisher.config.ts
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  versionStrategy: 'independent',
  // ... 其他配置
})
```

**优点**：
- 完整的类型提示
- 编译时类型检查
- 更好的 IDE 支持

### JavaScript 格式

```javascript
// publisher.config.js
const { defineConfig } = require('@ldesign/publisher')

module.exports = defineConfig({
  versionStrategy: 'independent',
  // ... 其他配置
})
```

### ES Module 格式

```javascript
// publisher.config.mjs
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  versionStrategy: 'independent',
  // ... 其他配置
})
```

### JSON 格式

```json
{
  "versionStrategy": "independent",
  "publish": {
    "access": "public"
  }
}
```

::: warning 注意
JSON 格式不支持函数类型的钩子，仅推荐用于简单配置。
:::

## 覆盖已存在的配置

如果配置文件已存在，默认会提示确认：

```bash
$ ldesign-publisher init
配置文件 publisher.config.ts 已存在，是否覆盖？ (y/N)
```

使用 `--force` 跳过确认：

```bash
ldesign-publisher init --force
```

## 初始化后的步骤

生成配置文件后，按照提示操作：

```
✅ 配置文件已生成: publisher.config.ts

下一步:
  1. 根据需要调整 publisher.config.ts 中的配置
  2. 运行 ldesign-publisher doctor 检查配置
  3. 运行 ldesign-publisher publish 开始发布
```

### 1. 调整配置

根据项目需求修改配置：

```typescript
export default defineConfig({
  // 修改版本策略
  versionStrategy: 'fixed',
  
  // 添加 Registry
  registries: {
    private: {
      url: 'https://npm.example.com',
      token: process.env.NPM_TOKEN,
    },
  },
  
  // 配置通知
  notifications: {
    enabled: true,
    channels: [
      {
        type: 'dingtalk',
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
        },
      },
    ],
  },
})
```

### 2. 验证配置

运行 doctor 命令检查：

```bash
ldesign-publisher doctor
```

### 3. 开始发布

```bash
# Dry-run 预览
ldesign-publisher publish --dry-run

# 正式发布
ldesign-publisher publish
```

## 完整示例

### 单包项目

```bash
# 1. 初始化
cd my-package
ldesign-publisher init --template standard

# 2. 调整配置（可选）
# 编辑 publisher.config.ts

# 3. 验证
ldesign-publisher doctor

# 4. 发布
ldesign-publisher publish
```

### Monorepo 项目

```bash
# 1. 在根目录初始化
cd my-monorepo
ldesign-publisher init --template monorepo

# 2. 配置通知
# 编辑 publisher.config.ts 添加 notifications

# 3. 预检查
ldesign-publisher precheck

# 4. 批量发布
ldesign-publisher publish
```

### Beta 版本发布

```bash
# 1. 使用 beta 模板
ldesign-publisher init --template beta --force

# 2. 更新为预发布版本
ldesign-publisher version prerelease --preid beta

# 3. 发布到 beta tag
ldesign-publisher publish --tag beta
```

## 常见问题

### 如何选择合适的模板？

根据项目类型选择：
- **单包**：standard 或 minimal
- **Monorepo**：monorepo
- **测试版**：beta
- **紧急修复**：hotfix

### 可以混合使用多个模板吗？

可以。先使用一个模板初始化，然后手动添加其他模板的配置。

### 如何从 Lerna 迁移？

```bash
# 1. 使用 monorepo 模板
ldesign-publisher init --template monorepo

# 2. 移除 lerna.json
rm lerna.json

# 3. 更新 package.json 脚本
# 将 lerna 命令替换为 ldesign-publisher
```

### 配置文件放在哪里？

默认生成在当前目录，建议：
- 单包项目：项目根目录
- Monorepo：仓库根目录

### 如何在 CI/CD 中使用？

```yaml
# .github/workflows/publish.yml
- name: Initialize Publisher
  run: |
    ldesign-publisher init --template standard --force
    # 或使用已提交的配置文件
```

## 下一步

- 查看[配置概览](/config/overview)了解所有配置选项
- 查看[环境诊断](/guide/doctor)验证环境
- 查看[发布流程](/guide/publish)开始发布
- 查看[配置模板](/config/templates)详细说明
