/**
 * 错误处理工具
 */

import type { PublishError } from '../types/index.js'

/**
 * Publisher 基础错误
 */
export class PublisherError extends Error {
  code: string
  details?: any
  suggestion?: string

  constructor(message: string, code: string, details?: any, suggestion?: string) {
    super(message)
    this.name = 'PublisherError'
    this.code = code
    this.details = details
    this.suggestion = suggestion
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON(): PublishError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
      suggestion: this.suggestion,
      fatal: true
    }
  }
}

/**
 * 验证错误
 */
export class ValidationError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'VALIDATION_ERROR', details, suggestion)
    this.name = 'ValidationError'
  }
}

/**
 * Registry 错误
 */
export class RegistryError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'REGISTRY_ERROR', details, suggestion)
    this.name = 'RegistryError'
  }
}

/**
 * 版本错误
 */
export class VersionError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'VERSION_ERROR', details, suggestion)
    this.name = 'VersionError'
  }
}

/**
 * Git 错误
 */
export class GitError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'GIT_ERROR', details, suggestion)
    this.name = 'GitError'
  }
}

/**
 * 发布错误
 */
export class PublishError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'PUBLISH_ERROR', details, suggestion)
    this.name = 'PublishError'
  }
}

/**
 * 配置错误
 */
export class ConfigError extends PublisherError {
  constructor(message: string, details?: any, suggestion?: string) {
    super(message, 'CONFIG_ERROR', details, suggestion)
    this.name = 'ConfigError'
  }
}

/**
 * 格式化错误信息
 */
export function formatError(error: Error | PublisherError): string {
  if (error instanceof PublisherError) {
    let message = `${error.message}`

    if (error.details) {
      message += `\n详情: ${JSON.stringify(error.details, null, 2)}`
    }

    if (error.suggestion) {
      message += `\n建议: ${error.suggestion}`
    }

    return message
  }

  return error.message
}

/**
 * 处理错误
 */
export function handleError(error: Error | PublisherError): never {
  console.error(formatError(error))

  if (error.stack && process.env.DEBUG) {
    console.error('\n堆栈跟踪:')
    console.error(error.stack)
  }

  process.exit(1)
}

