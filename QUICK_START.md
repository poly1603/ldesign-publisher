# @ldesign/publisher 快速开始

## 🚀 5 分钟上手指南

### 1. 安装

```bash
pnpm add -D @ldesign/publisher
```

### 2. 基础使用

#### 发布单个包

```bash
# 更新版本
ldesign-publisher version patch

# 发布
ldesign-publisher publish
```

#### Monorepo 发布

```bash
# 发布所有包
ldesign-publisher publish

# 发布特定包
ldesign-publisher publish --filter "@mycompany/*"

# Dry-run 模式
ldesign-publisher publish --dry-run
```

### 3. 配置文件（可选）

创建 `publisher.config.ts`：

```typescript
export default {
  // Registry 配置
  registries: {
    public: {
      url: 'https://registry.npmjs.org',
      access: 'public',
    },
  },
  
  // 发布配置
  publish: {
    tag: 'latest',
    confirm: true,
  },
  
  // Changelog 配置
  changelog: {
    enabled: true,
  },
}
```

### 4. 常用命令

```bash
# 查看当前版本
ldesign-publisher version

# 递增版本
ldesign-publisher version patch   # 0.0.1 -> 0.0.2
ldesign-publisher version minor   # 0.0.1 -> 0.1.0
ldesign-publisher version major   # 0.0.1 -> 1.0.0

# 生成 Changelog
ldesign-publisher changelog

# 发布
ldesign-publisher publish

# 回滚（废弃版本）
ldesign-publisher rollback @mypackage --version 1.0.0 --deprecate
```

### 5. CI/CD 集成

#### GitHub Actions

```yaml
name: Publish
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: ldesign-publisher publish
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 📖 更多文档

- [完整文档](./README.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [配置模板](./templates/publisher.config.template.ts)

## 💡 提示

1. **首次使用建议先用 `--dry-run` 模式测试**
2. **在 CI/CD 中使用时记得设置 `NPM_TOKEN` 环境变量**
3. **建议配置 `allowedBranches` 确保只在主分支发布**
4. **启用 `scanSensitiveData` 防止泄露敏感信息**

## 🎯 典型工作流

```bash
# 1. 开发功能
git checkout -b feature/new-feature

# 2. 提交代码（使用 Conventional Commits）
git commit -m "feat: add new feature"

# 3. 合并到主分支
git checkout main
git merge feature/new-feature

# 4. 更新版本（自动推荐）
ldesign-publisher version --recommend

# 5. 生成 Changelog
ldesign-publisher changelog

# 6. 发布
ldesign-publisher publish

# 7. 推送 tag
git push --tags
```

就这么简单！🎉

