/**
 * 发布锁工具
 * 
 * 防止并发发布操作导致的冲突
 * 
 * @example
 * ```typescript
 * const lock = new PublishLock()
 * 
 * try {
 *   await lock.acquire()
 *   // 执行发布操作
 *   await publish()
 * } finally {
 *   await lock.release()
 * }
 * ```
 * 
 * @packageDocumentation
 */

import { join } from 'path'
import { mkdir, writeFile, readFile, unlink, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { logger } from './logger.js'
import { TIMEOUT_CONFIG } from '../constants/index.js'

/**
 * 锁信息
 */
export interface LockInfo {
  /** 进程 ID */
  pid: number
  
  /** 创建时间 */
  createdAt: number
  
  /** 主机名 */
  hostname: string
  
  /** 锁超时时间 */
  timeout: number
  
  /** 额外信息 */
  meta?: Record<string, unknown>
}

/**
 * 发布锁选项
 */
export interface PublishLockOptions {
  /** 工作目录 */
  cwd?: string
  
  /** 锁文件名 */
  lockFileName?: string
  
  /** 锁超时时间 (ms) */
  timeout?: number
  
  /** 获取锁的重试间隔 (ms) */
  retryInterval?: number
  
  /** 获取锁的最大重试次数 */
  maxRetries?: number
  
  /** 是否强制获取锁（忽略已存在的锁） */
  force?: boolean
  
  /** 额外的锁元数据 */
  meta?: Record<string, unknown>
}

/**
 * 发布锁类
 * 
 * 使用文件锁机制防止并发发布
 */
export class PublishLock {
  private cwd: string
  private lockFilePath: string
  private options: Required<Omit<PublishLockOptions, 'meta'>> & { meta?: Record<string, unknown> }
  private acquired: boolean = false
  private lockInfo: LockInfo | null = null
  
  constructor(options: PublishLockOptions = {}) {
    this.cwd = options.cwd || process.cwd()
    this.options = {
      cwd: this.cwd,
      lockFileName: options.lockFileName || '.publish.lock',
      timeout: options.timeout || TIMEOUT_CONFIG.lock,
      retryInterval: options.retryInterval || 1000,
      maxRetries: options.maxRetries || 30,
      force: options.force || false,
      meta: options.meta,
    }
    
    this.lockFilePath = join(this.cwd, this.options.lockFileName)
  }
  
  /**
   * 获取锁
   * 
   * @returns 是否成功获取锁
   * @throws {LockError} 当无法获取锁时
   */
  async acquire(): Promise<boolean> {
    if (this.acquired) {
      logger.debug('已经持有锁')
      return true
    }
    
    let retries = 0
    
    while (retries < this.options.maxRetries) {
      try {
        // 检查是否已存在锁
        const existingLock = await this.readLockFile()
        
        if (existingLock) {
          // 检查锁是否过期
          const isExpired = Date.now() - existingLock.createdAt > existingLock.timeout
          
          // 检查持有锁的进程是否还存在
          const isStale = !this.isProcessRunning(existingLock.pid)
          
          if (isExpired || isStale || this.options.force) {
            logger.warn(`发现过期/无效的锁，将强制覆盖 (PID: ${existingLock.pid})`)
            await this.deleteLockFile()
          } else {
            // 锁被其他进程持有
            retries++
            const waitTime = this.options.retryInterval
            logger.debug(`锁被进程 ${existingLock.pid} 持有，等待 ${waitTime}ms 后重试 (${retries}/${this.options.maxRetries})`)
            await this.sleep(waitTime)
            continue
          }
        }
        
        // 创建锁文件
        await this.createLockFile()
        
        // 验证锁是否成功创建（处理竞争条件）
        const verifyLock = await this.readLockFile()
        if (verifyLock && verifyLock.pid === process.pid) {
          this.acquired = true
          this.lockInfo = verifyLock
          logger.debug(`成功获取锁 (PID: ${process.pid})`)
          return true
        }
        
        // 竞争失败，重试
        retries++
        await this.sleep(Math.random() * 100) // 随机延迟减少竞争
        
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // 锁文件不存在，创建它
          try {
            await this.createLockFile()
            this.acquired = true
            logger.debug(`成功获取锁 (PID: ${process.pid})`)
            return true
          } catch {
            retries++
            continue
          }
        }
        
        retries++
        logger.debug(`获取锁失败: ${error.message}，重试 (${retries}/${this.options.maxRetries})`)
        await this.sleep(this.options.retryInterval)
      }
    }
    
    throw new LockError(
      `无法获取发布锁，已重试 ${this.options.maxRetries} 次`,
      { lockPath: this.lockFilePath },
      '可能有其他发布进程正在运行，请稍后重试或使用 --force 强制发布'
    )
  }
  
  /**
   * 释放锁
   */
  async release(): Promise<void> {
    if (!this.acquired) {
      logger.debug('未持有锁，无需释放')
      return
    }
    
    try {
      // 验证锁是否属于当前进程
      const currentLock = await this.readLockFile()
      
      if (currentLock && currentLock.pid !== process.pid) {
        logger.warn(`锁已被其他进程 (PID: ${currentLock.pid}) 接管，无法释放`)
        this.acquired = false
        return
      }
      
      await this.deleteLockFile()
      this.acquired = false
      this.lockInfo = null
      logger.debug('锁已释放')
    } catch (error: any) {
      logger.warn(`释放锁失败: ${error.message}`)
      this.acquired = false
    }
  }
  
  /**
   * 检查是否持有锁
   * 
   * @returns 是否持有锁
   */
  isLocked(): boolean {
    return this.acquired
  }
  
  /**
   * 获取锁信息
   * 
   * @returns 锁信息
   */
  getLockInfo(): LockInfo | null {
    return this.lockInfo
  }
  
  /**
   * 检查锁状态
   * 
   * @returns 锁状态信息
   */
  async checkStatus(): Promise<{
    isLocked: boolean
    lockInfo: LockInfo | null
    isOwnedByCurrentProcess: boolean
    isExpired: boolean
    isStale: boolean
  }> {
    const lockInfo = await this.readLockFile()
    
    if (!lockInfo) {
      return {
        isLocked: false,
        lockInfo: null,
        isOwnedByCurrentProcess: false,
        isExpired: false,
        isStale: false,
      }
    }
    
    const isExpired = Date.now() - lockInfo.createdAt > lockInfo.timeout
    const isStale = !this.isProcessRunning(lockInfo.pid)
    
    return {
      isLocked: true,
      lockInfo,
      isOwnedByCurrentProcess: lockInfo.pid === process.pid,
      isExpired,
      isStale,
    }
  }
  
  /**
   * 创建锁文件
   */
  private async createLockFile(): Promise<void> {
    const lockInfo: LockInfo = {
      pid: process.pid,
      createdAt: Date.now(),
      hostname: this.getHostname(),
      timeout: this.options.timeout,
      meta: this.options.meta,
    }
    
    // 确保目录存在
    const lockDir = join(this.lockFilePath, '..')
    if (!existsSync(lockDir)) {
      await mkdir(lockDir, { recursive: true })
    }
    
    // 使用 wx 标志确保原子创建
    await writeFile(this.lockFilePath, JSON.stringify(lockInfo, null, 2), {
      flag: 'wx',
    }).catch(async () => {
      // 如果文件已存在，尝试覆盖（用于过期锁的情况）
      await writeFile(this.lockFilePath, JSON.stringify(lockInfo, null, 2))
    })
    
    this.lockInfo = lockInfo
  }
  
  /**
   * 读取锁文件
   */
  private async readLockFile(): Promise<LockInfo | null> {
    try {
      const content = await readFile(this.lockFilePath, 'utf-8')
      return JSON.parse(content) as LockInfo
    } catch {
      return null
    }
  }
  
  /**
   * 删除锁文件
   */
  private async deleteLockFile(): Promise<void> {
    try {
      await unlink(this.lockFilePath)
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }
  
  /**
   * 检查进程是否在运行
   * 
   * @param pid - 进程 ID
   * @returns 进程是否在运行
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // 发送信号 0 来检查进程是否存在
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }
  
  /**
   * 获取主机名
   */
  private getHostname(): string {
    try {
      return require('os').hostname()
    } catch {
      return 'unknown'
    }
  }
  
  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 锁错误
 */
export class LockError extends Error {
  code = 'LOCK_ERROR'
  details?: Record<string, unknown>
  suggestion?: string
  
  constructor(message: string, details?: Record<string, unknown>, suggestion?: string) {
    super(message)
    this.name = 'LockError'
    this.details = details
    this.suggestion = suggestion
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 创建发布锁实例
 * 
 * @param options - 选项
 * @returns 发布锁实例
 */
export function createPublishLock(options?: PublishLockOptions): PublishLock {
  return new PublishLock(options)
}

/**
 * 使用锁执行操作
 * 
 * 自动获取和释放锁
 * 
 * @param fn - 要执行的函数
 * @param options - 锁选项
 * @returns 函数执行结果
 * 
 * @example
 * ```typescript
 * const result = await withLock(
 *   async () => {
 *     // 执行发布操作
 *     return await publish()
 *   },
 *   { cwd: projectPath }
 * )
 * ```
 */
export async function withLock<T>(
  fn: () => Promise<T>,
  options?: PublishLockOptions
): Promise<T> {
  const lock = new PublishLock(options)
  
  try {
    await lock.acquire()
    return await fn()
  } finally {
    await lock.release()
  }
}

/**
 * 锁守卫装饰器
 * 
 * 自动为方法添加锁保护
 * 
 * @param options - 锁选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class Publisher {
 *   @withLockGuard()
 *   async publish() {
 *     // 此方法会自动获取和释放锁
 *   }
 * }
 * ```
 */
export function withLockGuard(options?: PublishLockOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return withLock(() => originalMethod.apply(this, args), options)
    }
    
    return descriptor
  }
}

/**
 * 全局锁管理器
 * 
 * 用于管理多个锁实例
 */
export class LockManager {
  private locks: Map<string, PublishLock> = new Map()
  
  /**
   * 获取或创建锁
   * 
   * @param name - 锁名称
   * @param options - 锁选项
   * @returns 锁实例
   */
  getLock(name: string, options?: PublishLockOptions): PublishLock {
    if (!this.locks.has(name)) {
      this.locks.set(name, new PublishLock({
        ...options,
        lockFileName: `.publish-${name}.lock`,
      }))
    }
    return this.locks.get(name)!
  }
  
  /**
   * 释放所有锁
   */
  async releaseAll(): Promise<void> {
    const releases = Array.from(this.locks.values()).map(lock => lock.release())
    await Promise.all(releases)
    this.locks.clear()
  }
  
  /**
   * 获取所有锁状态
   */
  async getAllStatus(): Promise<Map<string, ReturnType<PublishLock['checkStatus']>>> {
    const statuses = new Map<string, ReturnType<PublishLock['checkStatus']>>()
    
    for (const [name, lock] of this.locks) {
      statuses.set(name, lock.checkStatus())
    }
    
    return statuses
  }
}

/**
 * 全局锁管理器实例
 */
let globalLockManager: LockManager | null = null

/**
 * 获取全局锁管理器
 * 
 * @returns 锁管理器实例
 */
export function getGlobalLockManager(): LockManager {
  if (!globalLockManager) {
    globalLockManager = new LockManager()
  }
  return globalLockManager
}

/**
 * 重置全局锁管理器
 */
export async function resetGlobalLockManager(): Promise<void> {
  if (globalLockManager) {
    await globalLockManager.releaseAll()
    globalLockManager = null
  }
}
