---
layout: home

hero:
  name: "@ldesign/publisher"
  text: "NPM 发布管理工具"
  tagline: 🚀 功能强大的企业级 NPM 发布管理解决方案
  image:
    src: /hero-image.svg
    alt: Publisher Logo
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 查看 GitHub
      link: https://github.com/ldesign/packages/publisher

features:
  - icon: 🎯
    title: 智能版本管理
    details: 基于 Conventional Commits 自动推荐版本号，支持 Semver 规范，智能化的版本递增策略

  - icon: 📝
    title: 自动 Changelog
    details: 自动生成符合规范的变更日志，支持 GitHub/GitLab/Gitee 等平台链接，包含作者和 PR 信息

  - icon: 🔒
    title: 多 Registry 支持
    details: 支持 NPM 官方和私有 Registry，Scope 级别映射，Token 安全管理，2FA 认证

  - icon: 🏢
    title: Monorepo 支持
    details: 完整的工作空间依赖解析，拓扑排序，循环依赖检测，批量并行发布

  - icon: ✅
    title: 发布验证
    details: Git 状态检查，包内容验证，敏感信息扫描，环境检查，NPM 凭证验证

  - icon: 🔄
    title: 发布回滚
    details: 支持 unpublish 和 deprecate，Git tag 删除，提供完整的回滚指导

  - icon: 🔔
    title: 通知系统
    details: 支持钉钉、企业微信、Slack、邮件等多种通知渠道，灵活的触发条件配置

  - icon: 🌟
    title: 初始化向导
    details: 交互式配置生成，5 个预设模板，零配置快速开始，新用户友好

  - icon: 🩺
    title: 环境诊断
    details: 自动检测环境问题，8 项全面检查，详细的修复建议，提前发现问题

  - icon: 🔍
    title: Dry-run 增强
    details: 详细的发布预览分析，包大小估算，7 种问题检测，智能优化建议

  - icon: 📊
    title: 发布统计
    details: 自动记录发布历史，成功率统计，耗时分析，趋势预测，完整的分析报告

  - icon: ⚡
    title: 高性能
    details: 并行处理，智能缓存，性能提升 60-70%，支持批量并发发布
---

## 快速安装

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

## 简单易用

只需三步，快速开始发布：

```bash
# 1. 初始化配置
ldesign-publisher init

# 2. 诊断环境
ldesign-publisher doctor

# 3. 发布包
ldesign-publisher publish
```

## 功能特性

<div class="features-grid">

### 🎯 零配置开始

使用 `init` 命令快速生成配置，5 个预设模板覆盖常见场景，新手友好。

### 🔔 企业级通知

集成钉钉、企业微信、Slack 等主流工具，实时获取发布状态。

### 🩺 智能诊断

自动检测环境问题，提供详细修复建议，减少发布失败率。

### 📦 完整的发布流程

从版本管理、Changelog 生成、验证检查到发布、回滚，全流程支持。

</div>

## 为什么选择 Publisher？

- ✅ **功能完善** - 覆盖发布全流程，企业级功能齐全
- ✅ **易于使用** - 零配置快速开始，交互式向导引导
- ✅ **安全可靠** - 多重验证检查，敏感信息扫描
- ✅ **高性能** - 并行处理，智能缓存，性能优化
- ✅ **文档完善** - 详细的使用指南和 API 参考
- ✅ **活跃维护** - 持续更新，及时响应

<style>
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.features-grid h3 {
  font-size: 18px;
  margin-bottom: 8px;
}

.features-grid p {
  font-size: 14px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}
</style>
