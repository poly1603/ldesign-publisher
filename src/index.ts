/**
 * @ldesign/publisher - NPM 发布管理工具
 * 
 * 功能强大的 NPM 发布管理插件，支持：
 * - 智能版本管理（基于 Conventional Commits）
 * - 自动 Changelog 生成
 * - 多 Registry 支持
 * - Monorepo 批量发布
 * - 发布验证与回滚
 * - 生命周期钩子
 * - 发布审批流程
 * 
 * @example
 * ```typescript
 * import { createPublishManager } from '@ldesign/publisher'
 * 
 * const manager = createPublishManager({
 *   versionStrategy: 'independent',
 *   registries: {
 *     npm: { url: 'https://registry.npmjs.org' }
 *   }
 * })
 * 
 * const report = await manager.publish()
 * console.log(report.summary)
 * ```
 * 
 * @packageDocumentation
 */

// 核心模块
export * from './core/index.js'

// 验证器
export * from './validators/index.js'

// 工具函数
export * from './utils/index.js'

// 类型
export * from './types/index.js'

// CLI
export { createCLI, runCLI } from './cli/index.js'

// 便捷函数：定义配置
export function defineConfig(config: import('./types/index.js').PublisherConfig) {
  return config
}

