/**
 * 进度追踪器工具
 * 
 * 提供发布流程的进度追踪和展示功能
 * 
 * @example
 * ```typescript
 * const tracker = new ProgressTracker({ total: 5 })
 * tracker.start('发布包...')
 * 
 * for (const pkg of packages) {
 *   tracker.update(`发布 ${pkg.name}`)
 *   await publishPackage(pkg)
 *   tracker.increment()
 * }
 * 
 * tracker.complete('发布完成')
 * ```
 * 
 * @packageDocumentation
 */

import { logger } from './logger.js'

/**
 * 任务状态
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

/**
 * 任务信息
 */
export interface TaskInfo {
  /** 任务 ID */
  id: string
  
  /** 任务名称 */
  name: string
  
  /** 任务状态 */
  status: TaskStatus
  
  /** 开始时间 */
  startTime?: number
  
  /** 结束时间 */
  endTime?: number
  
  /** 耗时 (ms) */
  duration?: number
  
  /** 错误信息 */
  error?: string
  
  /** 进度百分比 (0-100) */
  progress?: number
  
  /** 额外信息 */
  message?: string
}

/**
 * 进度追踪器选项
 */
export interface ProgressTrackerOptions {
  /** 任务总数 */
  total?: number
  
  /** 是否显示 ETA */
  showETA?: boolean
  
  /** 是否显示进度条 */
  showBar?: boolean
  
  /** 进度条宽度 */
  barWidth?: number
  
  /** 是否静默模式 */
  silent?: boolean
  
  /** 更新间隔 (ms) */
  updateInterval?: number
}

/**
 * 进度统计
 */
export interface ProgressStats {
  /** 任务总数 */
  total: number
  
  /** 已完成数 */
  completed: number
  
  /** 失败数 */
  failed: number
  
  /** 跳过数 */
  skipped: number
  
  /** 进行中数 */
  running: number
  
  /** 待处理数 */
  pending: number
  
  /** 进度百分比 */
  percentage: number
  
  /** 已用时间 (ms) */
  elapsed: number
  
  /** 预计剩余时间 (ms) */
  eta: number | null
  
  /** 平均每任务耗时 (ms) */
  avgDuration: number | null
}

/**
 * 进度追踪器类
 */
export class ProgressTracker {
  private tasks: Map<string, TaskInfo> = new Map()
  private options: Required<ProgressTrackerOptions>
  private startTime: number = 0
  private currentTask: string | null = null
  private taskDurations: number[] = []
  
  constructor(options: ProgressTrackerOptions = {}) {
    this.options = {
      total: options.total || 0,
      showETA: options.showETA !== false,
      showBar: options.showBar !== false,
      barWidth: options.barWidth || 30,
      silent: options.silent || false,
      updateInterval: options.updateInterval || 100,
    }
  }
  
  /**
   * 开始追踪
   * 
   * @param message - 开始消息
   */
  start(message?: string): void {
    this.startTime = Date.now()
    
    if (!this.options.silent && message) {
      logger.info(message)
    }
  }
  
  /**
   * 添加任务
   * 
   * @param id - 任务 ID
   * @param name - 任务名称
   * @returns 任务信息
   */
  addTask(id: string, name: string): TaskInfo {
    const task: TaskInfo = {
      id,
      name,
      status: 'pending',
    }
    
    this.tasks.set(id, task)
    
    // 更新总数
    if (this.options.total < this.tasks.size) {
      this.options.total = this.tasks.size
    }
    
    return task
  }
  
  /**
   * 开始任务
   * 
   * @param id - 任务 ID
   * @param message - 可选的消息
   */
  startTask(id: string, message?: string): void {
    const task = this.tasks.get(id)
    if (!task) {
      // 自动创建任务
      this.addTask(id, message || id)
      return this.startTask(id, message)
    }
    
    task.status = 'running'
    task.startTime = Date.now()
    task.message = message
    this.currentTask = id
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 完成任务
   * 
   * @param id - 任务 ID
   * @param message - 可选的完成消息
   */
  completeTask(id: string, message?: string): void {
    const task = this.tasks.get(id)
    if (!task) return
    
    task.status = 'completed'
    task.endTime = Date.now()
    task.duration = task.startTime ? task.endTime - task.startTime : 0
    task.message = message
    
    // 记录耗时用于 ETA 计算
    if (task.duration > 0) {
      this.taskDurations.push(task.duration)
    }
    
    if (this.currentTask === id) {
      this.currentTask = null
    }
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 任务失败
   * 
   * @param id - 任务 ID
   * @param error - 错误信息
   */
  failTask(id: string, error: string | Error): void {
    const task = this.tasks.get(id)
    if (!task) return
    
    task.status = 'failed'
    task.endTime = Date.now()
    task.duration = task.startTime ? task.endTime - task.startTime : 0
    task.error = error instanceof Error ? error.message : error
    
    if (this.currentTask === id) {
      this.currentTask = null
    }
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 跳过任务
   * 
   * @param id - 任务 ID
   * @param reason - 跳过原因
   */
  skipTask(id: string, reason?: string): void {
    const task = this.tasks.get(id)
    if (!task) return
    
    task.status = 'skipped'
    task.message = reason
    
    if (this.currentTask === id) {
      this.currentTask = null
    }
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 更新当前任务进度
   * 
   * @param progress - 进度 (0-100)
   * @param message - 可选的消息
   */
  updateProgress(progress: number, message?: string): void {
    if (!this.currentTask) return
    
    const task = this.tasks.get(this.currentTask)
    if (!task) return
    
    task.progress = Math.min(100, Math.max(0, progress))
    if (message) {
      task.message = message
    }
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 更新消息
   * 
   * @param message - 消息
   */
  update(message: string): void {
    if (this.currentTask) {
      const task = this.tasks.get(this.currentTask)
      if (task) {
        task.message = message
      }
    }
    
    if (!this.options.silent) {
      this.render()
    }
  }
  
  /**
   * 递增完成计数（用于简单计数场景）
   */
  increment(): void {
    // 找到第一个 running 或 pending 的任务并完成它
    for (const task of this.tasks.values()) {
      if (task.status === 'running') {
        this.completeTask(task.id)
        return
      }
    }
  }
  
  /**
   * 完成追踪
   * 
   * @param message - 完成消息
   */
  complete(message?: string): void {
    if (!this.options.silent && message) {
      logger.success(message)
    }
  }
  
  /**
   * 获取进度统计
   * 
   * @returns 进度统计信息
   */
  getStats(): ProgressStats {
    let completed = 0
    let failed = 0
    let skipped = 0
    let running = 0
    let pending = 0
    
    for (const task of this.tasks.values()) {
      switch (task.status) {
        case 'completed':
          completed++
          break
        case 'failed':
          failed++
          break
        case 'skipped':
          skipped++
          break
        case 'running':
          running++
          break
        case 'pending':
          pending++
          break
      }
    }
    
    const total = this.options.total || this.tasks.size
    const processed = completed + failed + skipped
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0
    const elapsed = this.startTime ? Date.now() - this.startTime : 0
    
    // 计算 ETA
    let eta: number | null = null
    let avgDuration: number | null = null
    
    if (this.taskDurations.length > 0) {
      avgDuration = this.taskDurations.reduce((a, b) => a + b, 0) / this.taskDurations.length
      const remaining = total - processed
      if (remaining > 0) {
        eta = Math.round(avgDuration * remaining)
      }
    }
    
    return {
      total,
      completed,
      failed,
      skipped,
      running,
      pending,
      percentage,
      elapsed,
      eta,
      avgDuration,
    }
  }
  
  /**
   * 获取所有任务
   * 
   * @returns 任务列表
   */
  getTasks(): TaskInfo[] {
    return Array.from(this.tasks.values())
  }
  
  /**
   * 获取任务
   * 
   * @param id - 任务 ID
   * @returns 任务信息
   */
  getTask(id: string): TaskInfo | undefined {
    return this.tasks.get(id)
  }
  
  /**
   * 渲染进度
   */
  private render(): void {
    const stats = this.getStats()
    const { total, completed, failed, skipped, percentage, eta } = stats
    
    // 构建进度条
    let output = ''
    
    if (this.options.showBar) {
      const filled = Math.round((percentage / 100) * this.options.barWidth)
      const empty = this.options.barWidth - filled
      const bar = '█'.repeat(filled) + '░'.repeat(empty)
      output += `[${bar}] `
    }
    
    output += `${percentage}% (${completed + failed + skipped}/${total})`
    
    // 状态统计
    const statusParts: string[] = []
    if (completed > 0) statusParts.push(`✓${completed}`)
    if (failed > 0) statusParts.push(`✗${failed}`)
    if (skipped > 0) statusParts.push(`○${skipped}`)
    
    if (statusParts.length > 0) {
      output += ` [${statusParts.join(' ')}]`
    }
    
    // ETA
    if (this.options.showETA && eta !== null) {
      output += ` ETA: ${this.formatDuration(eta)}`
    }
    
    // 当前任务
    if (this.currentTask) {
      const task = this.tasks.get(this.currentTask)
      if (task?.message) {
        output += ` - ${task.message}`
      }
    }
    
    // 输出（使用 logger.info 避免换行问题）
    logger.verbose(output)
  }
  
  /**
   * 格式化时长
   * 
   * @param ms - 毫秒
   * @returns 格式化的时长字符串
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`
    }
    
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) {
      return `${seconds}s`
    }
    
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes < 60) {
      return `${minutes}m ${remainingSeconds}s`
    }
    
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  
  /**
   * 生成报告
   * 
   * @returns 格式化的报告字符串
   */
  generateReport(): string {
    const stats = this.getStats()
    const lines: string[] = []
    
    lines.push('进度报告')
    lines.push('='.repeat(50))
    lines.push('')
    
    // 统计信息
    lines.push(`总任务数: ${stats.total}`)
    lines.push(`  ✓ 成功: ${stats.completed}`)
    lines.push(`  ✗ 失败: ${stats.failed}`)
    lines.push(`  ○ 跳过: ${stats.skipped}`)
    lines.push(`  总耗时: ${this.formatDuration(stats.elapsed)}`)
    
    if (stats.avgDuration) {
      lines.push(`  平均耗时: ${this.formatDuration(stats.avgDuration)}`)
    }
    
    lines.push('')
    
    // 任务详情
    if (this.tasks.size > 0) {
      lines.push('任务详情:')
      
      for (const task of this.tasks.values()) {
        const statusIcon = this.getStatusIcon(task.status)
        let line = `  ${statusIcon} ${task.name}`
        
        if (task.duration) {
          line += ` (${this.formatDuration(task.duration)})`
        }
        
        if (task.error) {
          line += ` - ${task.error}`
        }
        
        lines.push(line)
      }
    }
    
    return lines.join('\n')
  }
  
  /**
   * 获取状态图标
   * 
   * @param status - 任务状态
   * @returns 状态图标
   */
  private getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case 'completed':
        return '✓'
      case 'failed':
        return '✗'
      case 'skipped':
        return '○'
      case 'running':
        return '●'
      case 'pending':
        return '◦'
      default:
        return '?'
    }
  }
  
  /**
   * 重置追踪器
   */
  reset(): void {
    this.tasks.clear()
    this.startTime = 0
    this.currentTask = null
    this.taskDurations = []
  }
}

/**
 * 创建进度追踪器实例
 * 
 * @param options - 选项
 * @returns 进度追踪器实例
 */
export function createProgressTracker(options?: ProgressTrackerOptions): ProgressTracker {
  return new ProgressTracker(options)
}

/**
 * 简单的进度计数器
 * 
 * 用于不需要详细任务追踪的场景
 */
export class SimpleProgress {
  private current: number = 0
  private total: number
  private startTime: number = 0
  private message: string = ''
  private silent: boolean
  
  constructor(total: number, silent = false) {
    this.total = total
    this.silent = silent
  }
  
  /**
   * 开始计数
   * 
   * @param message - 开始消息
   */
  start(message?: string): void {
    this.startTime = Date.now()
    this.message = message || ''
    this.current = 0
    
    if (!this.silent && message) {
      logger.info(message)
    }
  }
  
  /**
   * 递增计数
   * 
   * @param message - 可选的消息
   */
  increment(message?: string): void {
    this.current++
    if (message) {
      this.message = message
    }
    
    if (!this.silent) {
      const percentage = Math.round((this.current / this.total) * 100)
      logger.verbose(`[${percentage}%] ${this.current}/${this.total} ${this.message}`)
    }
  }
  
  /**
   * 完成计数
   * 
   * @param message - 完成消息
   */
  complete(message?: string): void {
    const elapsed = Date.now() - this.startTime
    
    if (!this.silent) {
      const msg = message || `完成 (${this.current}/${this.total})`
      logger.success(`${msg} - 耗时 ${elapsed}ms`)
    }
  }
  
  /**
   * 获取当前进度
   * 
   * @returns 进度信息
   */
  getProgress(): { current: number; total: number; percentage: number; elapsed: number } {
    return {
      current: this.current,
      total: this.total,
      percentage: Math.round((this.current / this.total) * 100),
      elapsed: this.startTime ? Date.now() - this.startTime : 0,
    }
  }
}

/**
 * 创建简单进度计数器
 * 
 * @param total - 总数
 * @param silent - 是否静默
 * @returns 进度计数器
 */
export function createSimpleProgress(total: number, silent = false): SimpleProgress {
  return new SimpleProgress(total, silent)
}
