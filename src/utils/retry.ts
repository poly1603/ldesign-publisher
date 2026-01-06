/**
 * 重试机制工具
 * 
 * 为网络操作和不稳定操作提供智能重试功能
 * 
 * @example
 * ```typescript
 * const result = await retry(
 *   () => fetchData(),
 *   { maxRetries: 3, initialDelay: 1000 }
 * )
 * ```
 * 
 * @packageDocumentation
 */

import { logger } from './logger.js'
import { RETRY_CONFIG } from '../constants/index.js'

/**
 * 重试选项
 */
export interface RetryOptions {
  /** 最大重试次数 */
  maxRetries?: number
  
  /** 初始延迟 (ms) */
  initialDelay?: number
  
  /** 最大延迟 (ms) */
  maxDelay?: number
  
  /** 退避因子 */
  backoffFactor?: number
  
  /** 是否应该重试的判断函数 */
  shouldRetry?: (error: Error, attempt: number) => boolean
  
  /** 重试前的回调 */
  onRetry?: (error: Error, attempt: number, delay: number) => void
  
  /** 超时时间 (ms) */
  timeout?: number
  
  /** 可重试的错误代码列表 */
  retryableErrors?: string[]
  
  /** 是否在最后一次失败时抛出所有错误 */
  throwAllErrors?: boolean
}

/**
 * 重试结果
 */
export interface RetryResult<T> {
  /** 操作结果 */
  data: T
  
  /** 重试次数 */
  attempts: number
  
  /** 总耗时 (ms) */
  totalTime: number
  
  /** 错误历史 */
  errors: Error[]
}

/**
 * 重试错误
 */
export class RetryError extends Error {
  /** 错误代码 */
  code = 'RETRY_EXHAUSTED'
  
  /** 重试次数 */
  attempts: number
  
  /** 所有错误 */
  errors: Error[]
  
  /** 最后一个错误 */
  lastError: Error
  
  constructor(message: string, attempts: number, errors: Error[]) {
    super(message)
    this.name = 'RetryError'
    this.attempts = attempts
    this.errors = errors
    this.lastError = errors[errors.length - 1]
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 默认的重试判断函数
 * 
 * @param error - 捕获的错误
 * @param retryableErrors - 可重试的错误代码列表
 * @returns 是否应该重试
 */
function defaultShouldRetry(error: Error, retryableErrors: string[]): boolean {
  // 检查错误代码
  const errorCode = (error as NodeJS.ErrnoException).code
  if (errorCode && retryableErrors.includes(errorCode)) {
    return true
  }
  
  // 检查错误消息
  const message = error.message.toLowerCase()
  
  // 网络相关错误
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('socket hang up') ||
    message.includes('503') ||
    message.includes('429') ||
    message.includes('too many requests') ||
    message.includes('service unavailable')
  ) {
    return true
  }
  
  return false
}

/**
 * 计算退避延迟
 * 
 * @param attempt - 当前尝试次数（从 1 开始）
 * @param options - 重试选项
 * @returns 延迟时间 (ms)
 */
function calculateDelay(
  attempt: number,
  options: Required<Pick<RetryOptions, 'initialDelay' | 'maxDelay' | 'backoffFactor'>>
): number {
  const { initialDelay, maxDelay, backoffFactor } = options
  
  // 指数退避 + 随机抖动
  const exponentialDelay = initialDelay * Math.pow(backoffFactor, attempt - 1)
  const jitter = Math.random() * 0.1 * exponentialDelay // 10% 抖动
  const delay = Math.min(exponentialDelay + jitter, maxDelay)
  
  return Math.round(delay)
}

/**
 * 等待指定时间
 * 
 * @param ms - 等待时间 (ms)
 * @returns Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 执行带超时的操作
 * 
 * @param fn - 要执行的函数
 * @param timeout - 超时时间 (ms)
 * @returns 操作结果
 */
async function withTimeout<T>(
  fn: () => Promise<T>,
  timeout: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`操作超时 (${timeout}ms)`))
    }, timeout)
    
    fn()
      .then(result => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}

/**
 * 重试执行异步操作
 * 
 * 使用指数退避算法，在操作失败时自动重试
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns 操作结果
 * @throws {RetryError} 当所有重试都失败时
 * 
 * @example
 * ```typescript
 * // 基本用法
 * const data = await retry(() => fetch('/api/data'))
 * 
 * // 自定义选项
 * const result = await retry(
 *   () => publishPackage(name),
 *   {
 *     maxRetries: 5,
 *     initialDelay: 2000,
 *     onRetry: (error, attempt) => {
 *       console.log(`第 ${attempt} 次重试: ${error.message}`)
 *     }
 *   }
 * )
 * 
 * // 使用详细结果
 * const { data, attempts, totalTime } = await retryWithResult(
 *   () => fetchData(),
 *   { maxRetries: 3 }
 * )
 * console.log(`成功，共尝试 ${attempts} 次，耗时 ${totalTime}ms`)
 * ```
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const result = await retryWithResult(fn, options)
  return result.data
}

/**
 * 重试执行并返回详细结果
 * 
 * @param fn - 要执行的异步函数
 * @param options - 重试选项
 * @returns 包含详细信息的结果
 */
export async function retryWithResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    initialDelay = RETRY_CONFIG.initialDelay,
    maxDelay = RETRY_CONFIG.maxDelay,
    backoffFactor = RETRY_CONFIG.backoffFactor,
    retryableErrors = [...RETRY_CONFIG.retryableErrors],
    shouldRetry,
    onRetry,
    timeout,
  } = options
  
  const errors: Error[] = []
  const startTime = Date.now()
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      // 执行操作（可能带超时）
      const operation = timeout ? withTimeout(fn, timeout) : fn()
      const data = await operation
      
      return {
        data,
        attempts: attempt,
        totalTime: Date.now() - startTime,
        errors,
      }
    } catch (error: any) {
      errors.push(error)
      
      // 检查是否是最后一次尝试
      if (attempt > maxRetries) {
        break
      }
      
      // 判断是否应该重试
      const shouldRetryNow = shouldRetry
        ? shouldRetry(error, attempt)
        : defaultShouldRetry(error, retryableErrors)
      
      if (!shouldRetryNow) {
        logger.debug(`错误不可重试: ${error.message}`)
        break
      }
      
      // 计算延迟时间
      const delay = calculateDelay(attempt, { initialDelay, maxDelay, backoffFactor })
      
      // 回调
      if (onRetry) {
        onRetry(error, attempt, delay)
      }
      
      logger.warn(`操作失败，${delay}ms 后进行第 ${attempt} 次重试: ${error.message}`)
      
      // 等待
      await sleep(delay)
    }
  }
  
  // 所有重试都失败
  const lastError = errors[errors.length - 1]
  throw new RetryError(
    `操作在 ${errors.length} 次尝试后失败: ${lastError.message}`,
    errors.length,
    errors
  )
}

/**
 * 创建可重试的函数包装器
 * 
 * @param fn - 要包装的函数
 * @param options - 重试选项
 * @returns 包装后的函数
 * 
 * @example
 * ```typescript
 * const fetchWithRetry = createRetryable(
 *   (url: string) => fetch(url),
 *   { maxRetries: 3 }
 * )
 * 
 * const data = await fetchWithRetry('/api/data')
 * ```
 */
export function createRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retry(() => fn(...args), options)
}

/**
 * 重试装饰器
 * 
 * 用于类方法的装饰器，自动添加重试功能
 * 
 * @param options - 重试选项
 * @returns 装饰器函数
 * 
 * @example
 * ```typescript
 * class ApiClient {
 *   @retryable({ maxRetries: 3 })
 *   async fetchData(id: string) {
 *     return await fetch(`/api/${id}`)
 *   }
 * }
 * ```
 */
export function retryable(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return retry(() => originalMethod.apply(this, args), options)
    }
    
    return descriptor
  }
}

/**
 * 批量重试执行
 * 
 * 对多个操作分别进行重试
 * 
 * @param operations - 要执行的操作数组
 * @param options - 重试选项
 * @returns 每个操作的结果（成功或错误）
 * 
 * @example
 * ```typescript
 * const results = await retryAll([
 *   () => publishPackage('pkg-a'),
 *   () => publishPackage('pkg-b'),
 *   () => publishPackage('pkg-c'),
 * ], { maxRetries: 3 })
 * 
 * for (const result of results) {
 *   if (result.status === 'fulfilled') {
 *     console.log('成功:', result.value)
 *   } else {
 *     console.error('失败:', result.reason)
 *   }
 * }
 * ```
 */
export async function retryAll<T>(
  operations: Array<() => Promise<T>>,
  options: RetryOptions = {}
): Promise<PromiseSettledResult<T>[]> {
  return Promise.allSettled(
    operations.map(op => retry(op, options))
  )
}

/**
 * 带条件的重试
 * 
 * 只有满足特定条件时才进行重试
 * 
 * @param fn - 要执行的函数
 * @param condition - 判断是否需要重试的条件函数
 * @param options - 重试选项
 * @returns 操作结果
 * 
 * @example
 * ```typescript
 * const result = await retryWhile(
 *   () => checkStatus(),
 *   (result) => result.status === 'pending', // 当状态为 pending 时继续重试
 *   { maxRetries: 10, initialDelay: 5000 }
 * )
 * ```
 */
export async function retryWhile<T>(
  fn: () => Promise<T>,
  condition: (result: T) => boolean,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    initialDelay = RETRY_CONFIG.initialDelay,
    maxDelay = RETRY_CONFIG.maxDelay,
    backoffFactor = RETRY_CONFIG.backoffFactor,
    onRetry,
  } = options
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const result = await fn()
    
    if (!condition(result)) {
      return result
    }
    
    if (attempt > maxRetries) {
      throw new Error(`条件在 ${maxRetries} 次重试后仍未满足`)
    }
    
    const delay = calculateDelay(attempt, { initialDelay, maxDelay, backoffFactor })
    
    if (onRetry) {
      onRetry(new Error('条件未满足'), attempt, delay)
    }
    
    logger.debug(`条件未满足，${delay}ms 后进行第 ${attempt} 次重试`)
    await sleep(delay)
  }
  
  // 不应该到达这里
  throw new Error('重试循环意外退出')
}
