# @ldesign/publisher

🚀 功能强大的 NPM 发布管理插件 - 智能版本管理、自动 Changelog、多 Registry 支持、Monorepo 批量发布、发布验证与回滚

## ✨ 特性

- 🎯 **智能版本管理** - 基于 Conventional Commits 自动推荐版本号
- 📝 **自动 Changelog** - 自动生成符合规范的变更日志
- 🔒 **多 Registry 支持** - 支持 npm 官方和私有 registry
- 🏢 **Monorepo 支持** - 完整的工作空间依赖解析和拓扑排序
- ✅ **发布验证** - Git 检查、包验证、敏感信息扫描
- 🔄 **发布回滚** - 支持 unpublish 和 deprecate
- 🎨 **友好的 CLI** - 交互式命令行界面
- ⚡ **并行发布** - 支持批量并发发布
- 🔐 **2FA 支持** - 支持双因素认证
- 📊 **详细报告** - 完整的发布报告和统计
- 🔔 **通知系统** 🆕 - 支持钉钉、企业微信、Slack、邮件通知
- 📝 **配置模板** 🆕 - 5 个预设模板，快速上手
- 🌟 **初始化向导** 🆕 - 交互式配置生成
- 🩺 **环境诊断** 🆕 - 自动检测环境问题
- 🔍 **Dry-run 增强** 🆕 - 详细的发布预览分析

## 📦 安装

```bash
# 使用 pnpm
pnpm add -D @ldesign/publisher

# 使用 npm
npm install --save-dev @ldesign/publisher

# 使用 yarn
yarn add -D @ldesign/publisher
```

## 🚀 快速开始

### 命令行使用

```bash
# 初始化配置 🆕
ldesign-publisher init

# 诊断环境 🆕
ldesign-publisher doctor

# 发布前检查
ldesign-publisher precheck

# 发布包
ldesign-publisher publish

# 更新版本
ldesign-publisher version patch

# 生成 Changelog
ldesign-publisher changelog

# 回滚发布
ldesign-publisher rollback <package> --version <version>

# 查看统计
ldesign-publisher stats
```

### 配置文件

创建 `publisher.config.ts`:

```typescript
import { defineConfig } from '@ldesign/publisher'

export default defineConfig({
  // 版本策略: fixed(统一版本) | independent(独立版本)
  versionStrategy: 'independent',

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
  },

  // 验证规则
  validation: {
    requireCleanWorkingDirectory: true,
    allowedBranches: ['main', 'master'],
    requireTests: true,
    requireBuild: true,
    scanSensitiveData: true,
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
  },
})
```

## 📚 命令详解

### init - 初始化配置 🆕

```bash
# 交互式初始化
ldesign-publisher init

# 使用指定模板
ldesign-publisher init --template monorepo

# 生成带注释的配置
ldesign-publisher init --commented

# 指定格式
ldesign-publisher init --format js

# 强制覆盖
ldesign-publisher init --force
```

**可用模板**：
- **standard** - 标准发布配置，适合大多数项目
- **monorepo** - Monorepo 项目配置
- **beta** - Beta 版本发布配置
- **hotfix** - 热修复发布配置
- **minimal** - 最小化配置

### doctor - 环境诊断 🆕

```bash
# 运行诊断
ldesign-publisher doctor

# 显示详细信息
ldesign-publisher doctor --verbose

# JSON 输出
ldesign-publisher doctor --json
```

**检查项**：
- ✅ Node.js 版本检查
- ✅ 包管理器检查（pnpm）
- ✅ Git 检查
- ✅ 配置文件检查
- ✅ package.json 检查
- ✅ NPM 认证检查
- ✅ 工作区状态检查
- ✅ 依赖安装检查

### precheck - 发布前预检查

```bash
# 完整的发布前检查
ldesign-publisher precheck

# 过滤包
ldesign-publisher precheck --filter "@mycompany/*"

# 严格模式（任何警告都视为失败）
ldesign-publisher precheck --strict

# JSON 输出
ldesign-publisher precheck --json
```

**检查内容：**
- ✅ 配置文件验证
- ✅ Git 状态检查（工作区、分支）
- ✅ 依赖关系验证（循环依赖检测）
- ✅ 包内容验证（必需文件、敏感信息扫描）
- ✅ 环境检查（Node.js、NPM 版本）
- ✅ NPM 凭证检查

### publish - 发布包

```bash
# 基本发布
ldesign-publisher publish

# Dry-run 模式（模拟发布）
ldesign-publisher publish --dry-run

# 跳过构建
ldesign-publisher publish --skip-build

# 指定 tag
ldesign-publisher publish --tag beta

# 过滤包（Monorepo）
ldesign-publisher publish --filter "@mycompany/*"

# 使用 2FA
ldesign-publisher publish --otp 123456
```

### version - 版本管理

```bash
# 查看当前版本
ldesign-publisher version

# 递增版本
ldesign-publisher version patch   # 0.0.1 -> 0.0.2
ldesign-publisher version minor   # 0.0.1 -> 0.1.0
ldesign-publisher version major   # 0.0.1 -> 1.0.0

# 预发布版本
ldesign-publisher version prerelease --preid beta  # 0.0.1 -> 0.0.2-beta.0

# 指定版本号
ldesign-publisher version --exact 1.2.3

# 获取推荐版本（基于 Conventional Commits）
ldesign-publisher version --recommend
```

### changelog - 生成 Changelog

```bash
# 生成 Changelog
ldesign-publisher changelog

# 指定范围
ldesign-publisher changelog --from v1.0.0 --to v2.0.0

# 指定输出文件
ldesign-publisher changelog --output HISTORY.md
```

### rollback - 回滚发布

```bash
# 废弃版本
ldesign-publisher rollback @mypackage --version 1.0.0 --deprecate

# 撤销发布（24小时内）
ldesign-publisher rollback @mypackage --version 1.0.0 --unpublish

# 删除 Git tag
ldesign-publisher rollback @mypackage --version 1.0.0 --delete-tag

# 完整回滚
ldesign-publisher rollback @mypackage --version 1.0.0 \\
  --unpublish \\
  --delete-tag \\
  --revert-git
```

### stats - 查看统计 🆕

```bash
# 查看发布统计
ldesign-publisher stats

# 显示最近20次发布
ldesign-publisher stats --recent 20

# JSON 输出
ldesign-publisher stats --json

# 清除统计数据
ldesign-publisher stats --clear
```

**统计内容：**
- 📊 总发布次数、成功率
- ⏱️ 平均耗时、最快/最慢记录
- 📅 按月统计
- 📝 最近发布历史

## 🔧 API 使用

```typescript
import {
  createPublishManager,
  createVersionManager,
  createChangelogGenerator,
  createRegistryManager,
  createHookManager,
  createPublishAnalytics,
  defineConfig,
} from '@ldesign/publisher'

// 发布管理
const publishManager = createPublishManager({
  publish: {
    dryRun: false,
    tag: 'latest',
  },
})

const report = await publishManager.publish()
console.log(report)

// 版本管理
const versionManager = createVersionManager()
const versionInfo = await versionManager.updateVersion({
  type: 'patch',
})

// Changelog 生成
const changelogGenerator = createChangelogGenerator()
await changelogGenerator.generateAndWrite('1.0.0')

// Registry 管理
const registryManager = createRegistryManager()
registryManager.addRegistry('custom', {
  url: 'https://npm.custom.com',
  token: 'xxx',
})

// 钩子管理 🆕
const hookManager = createHookManager({
  prePublish: async () => {
    console.log('准备发布...')
  },
  postPublish: async (report) => {
    console.log(`发布完成！成功: ${report.published.length}`)
  }
})

// 发布统计 🆕
const analytics = createPublishAnalytics()
const stats = await analytics.getStatistics()
console.log(`成功率: ${stats.successRate}%`)
await analytics.printReport()
```

## 🎯 Monorepo 支持

### 自动依赖解析

Publisher 会自动解析 Monorepo 中的包依赖关系，并按拓扑顺序发布：

```
packages/
  ├── core/          # 基础包
  ├── utils/         # 依赖 core
  └── components/    # 依赖 core 和 utils
```

发布顺序：`core` → `utils` → `components`

### 循环依赖检测

自动检测并报告循环依赖：

```
检测到循环依赖:
  @mycompany/a -> @mycompany/b -> @mycompany/c -> @mycompany/a
```

### 工作空间依赖更新

自动更新工作空间内的依赖版本：

```json
{
  "dependencies": {
    "@mycompany/core": "workspace:*"  // 自动更新为实际版本
  }
}
```

## 🔐 安全特性

### 敏感信息扫描

自动扫描以下内容：
- `.env` 文件
- 密钥文件（`.key`, `.pem`）
- Token 和密码
- SSH 密钥

### 包大小检查

默认限制 10MB，可配置：

```typescript
{
  validation: {
    maxPackageSize: 5 * 1024 * 1024, // 5MB
  }
}
```

### Git 工作区检查

确保发布前：
- 工作区干净（无未提交更改）
- 在允许的分支上（main/master）
- 无冲突文件

## 📊 发布报告

发布完成后会生成详细报告：

```
发布完成！
✓ 成功: 3
✗ 失败: 0
○ 跳过: 1

成功发布:
  ✓ @mycompany/core@1.0.0
  ✓ @mycompany/utils@1.0.0
  ✓ @mycompany/components@1.0.0

总耗时: 45.2s
```

## 🛠️ 高级功能

### 通知系统 🆕

支持多种通知渠道，发布成功/失败后自动发送通知：

```typescript
{
  notifications: {
    enabled: true,
    channels: [
      // 钉钉
      {
        type: 'dingtalk',
        when: ['success', 'failure'],
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
          secret: process.env.DINGTALK_SECRET,
          atAll: false,
        },
      },
      // 企业微信
      {
        type: 'wecom',
        when: ['failure'],  // 只在失败时通知
        config: {
          webhook: process.env.WECOM_WEBHOOK,
        },
      },
      // Slack
      {
        type: 'slack',
        config: {
          webhook: process.env.SLACK_WEBHOOK,
          channel: '#releases',
        },
      },
      // 自定义 Webhook
      {
        type: 'webhook',
        config: {
          url: 'https://api.example.com/notify',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.API_TOKEN}`,
          },
        },
      },
    ],
  },
}
```

**支持的通知渠道**：
- 🐝 **钉钉** - 支持签名、@所有人、@指定人员
- 📢 **企业微信** - 支持 @用户、@手机号
- 📧 **Slack** - 支持自定义频道、用户名、emoji
- ✉️ **邮件** - 支持 SMTP（需要 nodemailer）
- 🔗 **自定义 Webhook** - 支持任意 HTTP API

### 生命周期钩子

```typescript
{
  hooks: {
    prePublish: 'pnpm test && pnpm lint',
    postPublish: async (result) => {
      // 发送通知
      await notify(result)
    },
  }
}
```

### 自定义验证器

```typescript
{
  validation: {
    customValidators: [
      async (packageInfo) => {
        // 自定义验证逻辑
        return { valid: true, errors: [], warnings: [] }
      },
    ],
  }
}
```

### 并行发布

```typescript
{
  monorepo: {
    publishOrder: 'parallel',  // 并行发布独立的包
  },
  concurrency: 4,  // 最大并发数
}
```

## 📝 Changelog 格式

自动生成的 Changelog 格式：

```markdown
## [1.0.0] - 2024-01-20

### ✨ 新功能

- **core**: 添加新的 API (#123) ([abc1234](link)) - @author

### 🐛 Bug 修复

- **utils**: 修复边界情况 (#124) ([def5678](link)) - @author

### ⚡ 性能优化

- 优化打包速度 ([ghi9012](link)) - @author
```

## 🤝 与其他工具集成

### 与 @ldesign/builder 集成

自动调用 builder 进行构建：

```typescript
{
  publish: {
    skipBuild: false,  // 启用自动构建
  }
}
```

### 与 CI/CD 集成

GitHub Actions 示例：

```yaml
name: Publish
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Publish
        run: |
          ldesign-publisher version ${{ inputs.version }}
          ldesign-publisher publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📚 更多资源

- [完整文档](https://ldesign.dev/publisher)
- [API 参考](https://ldesign.dev/publisher/api)
- [示例项目](https://github.com/ldesign/examples)
- [常见问题](https://ldesign.dev/publisher/faq)

## 📄 许可证

MIT © LDesign Team

