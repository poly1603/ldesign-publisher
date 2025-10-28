# @ldesign/publisher 文档

这是 @ldesign/publisher 的完整文档站点，使用 VitePress 构建。

## 本地开发

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
# 进入 docs 目录
cd docs

# 启动开发服务器
pnpm docs:dev
```

文档将在 `http://localhost:5173` 运行。

### 构建文档

```bash
pnpm docs:build
```

构建产物将输出到 `docs/.vitepress/dist` 目录。

### 预览构建结果

```bash
pnpm docs:preview
```

## 文档结构

```
docs/
├── .vitepress/
│   └── config.ts          # VitePress 配置
├── guide/                 # 指南
│   ├── introduction.md
│   ├── getting-started.md
│   ├── notifications.md
│   └── ...
├── api/                   # API 参考
│   ├── core.md
│   ├── publish-manager.md
│   └── ...
├── config/                # 配置文档
│   ├── overview.md
│   ├── templates.md
│   └── ...
├── public/                # 静态资源
│   └── logo.svg
└── index.md              # 首页
```

## 添加新页面

1. 在相应目录创建 Markdown 文件
2. 在 `.vitepress/config.ts` 的 `sidebar` 中添加链接
3. 使用 frontmatter 添加元数据

示例：

```markdown
---
title: 页面标题
description: 页面描述
---

# 页面标题

内容...
```

## 文档编写规范

### Markdown 增强

VitePress 支持多种 Markdown 增强特性：

#### 代码组

```markdown
::: code-group

```bash [pnpm]
pnpm add @ldesign/publisher
```

```bash [npm]
npm install @ldesign/publisher
```

:::
```

#### 自定义容器

```markdown
::: tip 提示
这是一条提示信息
:::

::: warning 警告
这是一条警告信息
:::

::: danger 危险
这是一条危险信息
:::

::: info 信息
这是一条普通信息
:::
```

#### 代码块高亮

```markdown
```ts{2,4-6}
function example() {
  const a = 1 // 高亮
  const b = 2
  const c = 3 // 高亮
  const d = 4 // 高亮
  const e = 5 // 高亮
}
```
```

### 链接规范

- 内部链接使用相对路径：`[文本](/guide/introduction)`
- 外部链接自动添加图标
- 链接区分大小写

### 图片资源

图片放在 `public` 目录：

```markdown
![描述](/image.png)
```

## 部署

文档可以部署到任何静态站点托管服务：

### GitHub Pages

```yaml
# .github/workflows/deploy.yml
name: Deploy Docs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: pnpm
      
      - run: pnpm install
      - run: pnpm docs:build
      
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: docs/.vitepress/dist
```

### Vercel

1. 导入 GitHub 仓库
2. 设置构建命令: `pnpm docs:build`
3. 设置输出目录: `docs/.vitepress/dist`

### Netlify

1. 导入 GitHub 仓库
2. 设置构建命令: `pnpm docs:build`
3. 设置发布目录: `docs/.vitepress/dist`

## 贡献

欢迎贡献文档！请确保：

1. 遵循现有的文档结构和风格
2. 代码示例经过测试
3. 检查拼写和语法
4. 提交前本地预览

## 相关资源

- [VitePress 文档](https://vitepress.dev)
- [Markdown 语法](https://www.markdownguide.org/)
- [Publisher GitHub](https://github.com/ldesign/packages/publisher)
