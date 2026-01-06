/**
 * 缓存工具 - 提供内存缓存功能以优化性能
 * 
 * 支持功能：
 * - TTL（生存时间）缓存
 * - LRU（最近最少使用）缓存
 * - 缓存命中率统计
 * - 自动过期清理
 * 
 * @example
 * ```typescript
 * const cache = new MemoryCache({ ttl: 60000, maxSize: 100 })
 * 
 * // 设置缓存
 * cache.set('key', 'value')
 * 
 * // 获取缓存
 * const value = cache.get('key')
 * 
 * // 检查是否存在
 * if (cache.has('key')) {
 *   // ...
 * }
 * ```
 */

import { logger } from './logger.js'

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  /** 缓存值 */
  value: T
  /** 过期时间戳 */
  expiresAt: number
  /** 最后访问时间 */
  lastAccessed: number
  /** 访问次数 */
  accessCount: number
}

/**
 * 缓存选项
 */
export interface CacheOptions {
  /** 缓存生存时间（毫秒），默认 5 分钟 */
  ttl?: number
  /** 最大缓存数量，默认 1000 */
  maxSize?: number
  /** 是否启用自动清理，默认 true */
  autoCleanup?: boolean
  /** 自动清理间隔（毫秒），默认 1 分钟 */
  cleanupInterval?: number
}

/**
 * 缓存统计信息
 */
export interface CacheStats {
  /** 缓存命中次数 */
  hits: number
  /** 缓存未命中次数 */
  misses: number
  /** 缓存命中率 */
  hitRate: number
  /** 当前缓存数量 */
  size: number
  /** 最大缓存数量 */
  maxSize: number
}

/**
 * 内存缓存类
 */
export class MemoryCache<T = any> {
  private cache: Map<string, CacheItem<T>> = new Map()
  private options: Required<CacheOptions>
  private hits: number = 0
  private misses: number = 0
  private cleanupTimer?: NodeJS.Timeout

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5 分钟
      maxSize: options.maxSize || 1000,
      autoCleanup: options.autoCleanup !== false,
      cleanupInterval: options.cleanupInterval || 60 * 1000, // 1 分钟
    }

    if (this.options.autoCleanup) {
      this.startAutoCleanup()
    }
  }

  /**
   * 设置缓存
   * 
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 自定义 TTL（可选）
   * 
   * @example
   * ```typescript
   * cache.set('user:123', { name: 'John' })
   * cache.set('temp:data', 'value', 1000) // 1 秒后过期
   * ```
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.options.ttl)
    const existingItem = this.cache.get(key)
    const isNewKey = !existingItem

    // 检查缓存是否已满（仅对新键检查）
    if (isNewKey && this.cache.size >= this.options.maxSize) {
      this.evictLRU()
    }

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      accessCount: existingItem?.accessCount || 0,
    })

    logger.verbose(`缓存已设置: ${key}`)
  }

  /**
   * 获取缓存
   * 
   * @param key - 缓存键
   * @returns 缓存值，如果不存在或已过期则返回 undefined
   * 
   * @example
   * ```typescript
   * const user = cache.get('user:123')
   * if (user) {
   *   console.log(user.name)
   * }
   * ```
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key)

    if (!item) {
      this.misses++
      logger.verbose(`缓存未命中: ${key}`)
      return undefined
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      this.misses++
      logger.verbose(`缓存已过期: ${key}`)
      return undefined
    }

    // 更新访问信息
    item.lastAccessed = Date.now()
    item.accessCount++
    this.hits++

    logger.verbose(`缓存命中: ${key}`)
    return item.value
  }

  /**
   * 检查缓存是否存在且未过期
   * 
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: string): boolean {
    const item = this.cache.get(key)
    if (!item) return false

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 删除缓存
   * 
   * @param key - 缓存键
   * @returns 是否删除成功
   */
  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    logger.debug('缓存已清空')
  }

  /**
   * 获取缓存大小
   * 
   * @returns 当前缓存数量
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * 获取所有缓存键
   * 
   * @returns 缓存键数组
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * 获取缓存统计信息
   * 
   * @returns 统计信息
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.cache.size,
      maxSize: this.options.maxSize,
    }
  }

  /**
   * 打印缓存统计信息
   */
  printStats(): void {
    const stats = this.getStats()
    logger.info('缓存统计:')
    logger.info(`  命中: ${stats.hits}`)
    logger.info(`  未命中: ${stats.misses}`)
    logger.info(`  命中率: ${(stats.hitRate * 100).toFixed(2)}%`)
    logger.info(`  大小: ${stats.size}/${stats.maxSize}`)
  }

  /**
   * 清理过期缓存
   * 
   * @returns 清理的缓存数量
   */
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug(`清理了 ${cleaned} 个过期缓存`)
    }

    return cleaned
  }

  /**
   * 驱逐最近最少使用的缓存项（LRU）
   * 
   * @private
   */
  private evictLRU(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
      logger.verbose(`驱逐 LRU 缓存: ${oldestKey}`)
    }
  }

  /**
   * 开始自动清理
   * 
   * @private
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.options.cleanupInterval)

    // 确保在进程退出时清理定时器
    if (typeof process !== 'undefined') {
      process.on('beforeExit', () => {
        this.stopAutoCleanup()
      })
    }
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 销毁缓存
   * 
   * 清空所有缓存并停止自动清理
   */
  destroy(): void {
    this.clear()
    this.stopAutoCleanup()
  }
}

/**
 * 全局缓存实例（单例）
 */
let globalCache: MemoryCache | null = null

/**
 * 获取全局缓存实例
 * 
 * @param options - 缓存选项（仅在首次调用时生效）
 * @returns 全局缓存实例
 * 
 * @example
 * ```typescript
 * const cache = getGlobalCache()
 * cache.set('key', 'value')
 * ```
 */
export function getGlobalCache(options?: CacheOptions): MemoryCache {
  if (!globalCache) {
    globalCache = new MemoryCache(options)
  }
  return globalCache
}

/**
 * 重置全局缓存
 * 
 * 销毁当前的全局缓存实例
 */
export function resetGlobalCache(): void {
  if (globalCache) {
    globalCache.destroy()
    globalCache = null
  }
}

/**
 * 缓存装饰器工厂
 * 
 * 为异步方法添加缓存功能
 * 
 * @param options - 缓存选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class MyClass {
 *   @cached({ ttl: 60000 })
 *   async fetchData(id: string) {
 *     // 耗时操作
 *     return await api.fetch(id)
 *   }
 * }
 * ```
 */
export function cached(options: CacheOptions = {}) {
  const cache = new MemoryCache(options)

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args)}`

      // 尝试从缓存获取
      const cachedValue = cache.get(cacheKey)
      if (cachedValue !== undefined) {
        return cachedValue
      }

      // 执行原方法
      const result = await originalMethod.apply(this, args)

      // 缓存结果
      cache.set(cacheKey, result)

      return result
    }

    return descriptor
  }
}

