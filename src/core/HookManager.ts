/**
 * 钩子管理器 - 管理发布流程中的生命周期钩子
 * 
 * 支持功能：
 * - 同步和异步钩子执行
 * - 命令行字符串钩子
 * - JavaScript/TypeScript 函数钩子
 * - 钩子执行结果追踪
 * - 钩子失败处理
 * 
 * @example
 * ```typescript
 * const hookManager = new HookManager({
 *   prePublish: async () => {
 *     console.log('准备发布...')
 *   },
 *   postPublish: 'echo "发布完成"'
 * })
 * 
 * await hookManager.executeHook('prePublish')
 * ```
 */

import { execa } from 'execa'
import type { LifecycleHooks } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { PublisherError } from '../utils/error-handler.js'

export interface HookExecutionResult {
  /** 钩子名称 */
  name: string
  /** 是否成功 */
  success: boolean
  /** 执行时间 (ms) */
  duration: number
  /** 输出内容 */
  output?: string
  /** 错误信息 */
  error?: string
}

/**
 * 钩子管理器类
 */
export class HookManager {
  private hooks: LifecycleHooks
  private cwd: string
  private executionResults: Map<string, HookExecutionResult[]> = new Map()

  constructor(hooks: LifecycleHooks = {}, cwd: string = process.cwd()) {
    this.hooks = hooks
    this.cwd = cwd
  }

  /**
   * 执行钩子
   * 
   * @param hookName - 钩子名称
   * @param context - 传递给钩子的上下文数据
   * @returns 钩子执行结果
   * @throws {PublisherError} 当钩子执行失败且配置为致命错误时
   * 
   * @example
   * ```typescript
   * await hookManager.executeHook('prePublish')
   * await hookManager.executeHook('postVersion', { version: '1.0.0' })
   * ```
   */
  async executeHook(
    hookName: keyof LifecycleHooks,
    context?: any
  ): Promise<HookExecutionResult[]> {
    const hook = this.hooks[hookName]

    if (!hook) {
      logger.debug(`钩子 ${hookName} 未配置，跳过`)
      return []
    }

    logger.info(`执行钩子: ${hookName}`)

    const results: HookExecutionResult[] = []
    const hooks = Array.isArray(hook) ? hook : [hook]

    for (const h of hooks) {
      const startTime = Date.now()
      const result: HookExecutionResult = {
        name: hookName,
        success: false,
        duration: 0,
      }

      try {
        if (typeof h === 'string') {
          // 执行命令行钩子
          const output = await this.executeCommandHook(h)
          result.output = output
          result.success = true
        } else if (typeof h === 'function') {
          // 执行函数钩子
          const output = await this.executeFunctionHook(h, context)
          result.output = output
          result.success = true
        } else {
          throw new PublisherError(
            `无效的钩子类型: ${typeof h}`,
            'INVALID_HOOK_TYPE',
            { hookName, hookType: typeof h },
            '钩子必须是字符串命令或函数'
          )
        }

        result.duration = Date.now() - startTime
        logger.success(`✓ 钩子 ${hookName} 执行成功 (${result.duration}ms)`)
      } catch (error: any) {
        result.success = false
        result.error = error.message
        result.duration = Date.now() - startTime

        logger.error(`✗ 钩子 ${hookName} 执行失败: ${error.message}`)

        // 钩子失败通常不应该中断整个流程，只记录错误
        // 如果需要严格模式，可以在这里抛出错误
      }

      results.push(result)
    }

    // 保存执行结果
    if (!this.executionResults.has(hookName)) {
      this.executionResults.set(hookName, [])
    }
    this.executionResults.get(hookName)!.push(...results)

    return results
  }

  /**
   * 执行命令行钩子
   * 
   * @param command - 要执行的命令
   * @returns 命令输出
   * @private
   */
  private async executeCommandHook(command: string): Promise<string> {
    logger.verbose(`执行命令: ${command}`)

    try {
      const result = await execa(command, {
        cwd: this.cwd,
        shell: true,
        stdout: 'pipe',
        stderr: 'pipe',
      })

      return result.stdout
    } catch (error: any) {
      throw new PublisherError(
        `命令执行失败: ${error.message}`,
        'HOOK_COMMAND_FAILED',
        { command, error: error.message },
        '请检查命令是否正确，以及是否有必要的权限'
      )
    }
  }

  /**
   * 执行函数钩子
   * 
   * @param fn - 要执行的函数
   * @param context - 传递给函数的上下文
   * @returns 函数返回值（转换为字符串）
   * @private
   */
  private async executeFunctionHook(fn: Function, context?: any): Promise<string> {
    logger.verbose('执行函数钩子')

    try {
      const result = await fn(context)
      return result ? String(result) : ''
    } catch (error: any) {
      throw new PublisherError(
        `函数钩子执行失败: ${error.message}`,
        'HOOK_FUNCTION_FAILED',
        { error: error.message },
        '请检查钩子函数是否正确实现'
      )
    }
  }

  /**
   * 获取钩子执行历史
   * 
   * @param hookName - 钩子名称，如果不提供则返回所有钩子的历史
   * @returns 钩子执行结果
   */
  getExecutionHistory(hookName?: keyof LifecycleHooks): HookExecutionResult[] {
    if (hookName) {
      return this.executionResults.get(hookName) || []
    }

    const allResults: HookExecutionResult[] = []
    for (const results of this.executionResults.values()) {
      allResults.push(...results)
    }
    return allResults
  }

  /**
   * 清除执行历史
   */
  clearHistory(): void {
    this.executionResults.clear()
  }

  /**
   * 检查钩子是否配置
   * 
   * @param hookName - 钩子名称
   * @returns 是否配置了该钩子
   */
  hasHook(hookName: keyof LifecycleHooks): boolean {
    return !!this.hooks[hookName]
  }

  /**
   * 批量执行多个钩子
   * 
   * @param hookNames - 钩子名称数组
   * @param context - 传递给钩子的上下文
   * @returns 所有钩子的执行结果
   */
  async executeHooks(
    hookNames: Array<keyof LifecycleHooks>,
    context?: any
  ): Promise<Map<string, HookExecutionResult[]>> {
    const results = new Map<string, HookExecutionResult[]>()

    for (const hookName of hookNames) {
      const hookResults = await this.executeHook(hookName, context)
      results.set(hookName, hookResults)
    }

    return results
  }

  /**
   * 生成钩子执行报告
   * 
   * @returns 格式化的报告字符串
   */
  generateReport(): string {
    const lines: string[] = []
    lines.push('钩子执行报告')
    lines.push('='.repeat(50))

    for (const [hookName, results] of this.executionResults) {
      lines.push(`\n${hookName}:`)
      for (const result of results) {
        const status = result.success ? '✓' : '✗'
        lines.push(`  ${status} ${result.duration}ms`)
        if (result.error) {
          lines.push(`    错误: ${result.error}`)
        }
      }
    }

    return lines.join('\n')
  }
}

/**
 * 创建钩子管理器实例
 * 
 * @param hooks - 生命周期钩子配置
 * @param cwd - 工作目录
 * @returns 钩子管理器实例
 */
export function createHookManager(
  hooks: LifecycleHooks = {},
  cwd?: string
): HookManager {
  return new HookManager(hooks, cwd)
}

