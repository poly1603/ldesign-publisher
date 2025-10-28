# 快速开始

本指南将帮助你在 5 分钟内开始使用 @ldesign/publisher。

## 安装

::: code-group

```bash [pnpm]
pnpm add -D @ldesign/publisher
```

```bash [npm]
npm install --save-dev @ldesign/publisher
```

```bash [yarn]
yarn add -D @ldesign/publisher
```

:::

## 初始化配置

使用 `init` 命令快速生成配置文件：

```bash
ldesign-publisher init
```

这将启动交互式向导，引导你完成配置。你可以选择预设模板：

- **Standard** - 标准发布配置，适合大多数项目
- **Monorepo** - Monorepo 项目配置
- **Beta** - Beta 版本发布配置
- **Hotfix** - 热修复发布配置
- **Minimal** - 最小化配置

或者直接使用模板：

```bash
# 使用 monorepo 模板
ldesign-publisher init --template monorepo

# 生成带注释的配置
ldesign-publisher init --commented
```

## 环境诊断

在发布前，运行诊断命令检查环境：

```bash
ldesign-publisher doctor
```

这会检查：
- ✅ Node.js 版本
- ✅ 包管理器（pnpm）
- ✅ Git 状态
- ✅ 配置文件
- ✅ NPM 认证
- ✅ 依赖安装

## 发布前检查

运行预检查命令，确保一切就绪：

```bash
ldesign-publisher precheck
```

## 第一次发布

现在可以发布你的包了：

```bash
# Dry-run 模式（推荐先运行）
ldesign-publisher publish --dry-run

# 正式发布
ldesign-publisher publish
```

## 完整工作流

推荐的完整工作流程：

```bash
# 1. 开发完成，提交代码
git add .
git commit -m "feat: 添加新功能"

# 2. 初始化配置（仅首次）
ldesign-publisher init

# 3. 环境诊断
ldesign-publisher doctor

# 4. 更新版本号
ldesign-publisher version patch

# 5. 生成 Changelog
ldesign-publisher changelog

# 6. 预检查
ldesign-publisher precheck

# 7. Dry-run 检查
ldesign-publisher publish --dry-run

# 8. 正式发布
ldesign-publisher publish

# 9. 查看统计
ldesign-publisher stats
```

## 配置通知

编辑 `publisher.config.ts`，添加通知配置：

```typescript
export default defineConfig({
  // ... 其他配置

  notifications: {
    enabled: true,
    channels: [
      {
        type: 'dingtalk',
        when: ['success', 'failure'],
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
        },
      },
    ],
  },
})
```

## CLI 命令概览

| 命令 | 说明 |
|------|------|
| `init` | 初始化配置文件 |
| `doctor` | 环境诊断 |
| `precheck` | 发布前检查 |
| `publish` | 发布包 |
| `version` | 更新版本号 |
| `changelog` | 生成 Changelog |
| `rollback` | 回滚发布 |
| `stats` | 查看统计 |

## 下一步

- 📖 阅读[配置指南](/config/overview)了解详细配置
- 🔔 配置[通知系统](/guide/notifications)获取发布状态
- 🏢 如果使用 Monorepo，查看 [Monorepo 指南](/guide/monorepo)
- 🔧 了解[最佳实践](/guide/project-setup)

## 常见问题

### 如何跳过某些步骤？

```bash
# 跳过构建
ldesign-publisher publish --skip-build

# 跳过测试
ldesign-publisher publish --skip-tests

# 跳过 Git 检查
ldesign-publisher publish --skip-git-check
```

### 如何发布 Beta 版本？

```bash
# 更新为预发布版本
ldesign-publisher version prerelease --preid beta

# 发布到 beta tag
ldesign-publisher publish --tag beta
```

### 如何回滚发布？

```bash
# 废弃版本
ldesign-publisher rollback <package> --version 1.0.0 --deprecate

# 撤销发布（24小时内）
ldesign-publisher rollback <package> --version 1.0.0 --unpublish
```

## 获取帮助

- 💬 [GitHub Issues](https://github.com/ldesign/packages/publisher/issues)
- 📖 [完整文档](/guide/introduction)
- 🔍 使用右上角搜索功能查找内容
