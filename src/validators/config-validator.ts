/**
 * 配置验证器 - 验证 Publisher 配置的完整性和正确性
 * 
 * 使用 Zod 进行强类型验证，提供详细的错误提示和自动补全建议
 * 
 * @example
 * ```typescript
 * const validator = new ConfigValidator()
 * const result = await validator.validate(config)
 * 
 * if (!result.valid) {
 *   console.error('配置验证失败:', result.errors)
 * }
 * ```
 */

import { z } from 'zod'
import type { PublisherConfig, ValidationResult, ValidationError } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { ConfigError } from '../utils/error-handler.js'

/**
 * Registry 配置 Schema
 */
const registryConfigSchema = z.object({
  url: z.string().url('Registry URL 必须是有效的 URL'),
  token: z.string().optional(),
  access: z.enum(['public', 'restricted']).optional(),
  scopes: z.array(z.string()).optional(),
  otp: z.boolean().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().positive().optional(),
})

/**
 * 发布选项 Schema
 */
const publishOptionsSchema = z.object({
  registry: z.string().optional(),
  access: z.enum(['public', 'restricted']).optional(),
  tag: z.string().optional(),
  otp: z.union([z.boolean(), z.string()]).optional(),
  dryRun: z.boolean().optional(),
  skipBuild: z.boolean().optional(),
  skipTests: z.boolean().optional(),
  skipGitCheck: z.boolean().optional(),
  force: z.boolean().optional(),
  retries: z.number().nonnegative().optional(),
  retryDelay: z.number().nonnegative().optional(),
  parallel: z.boolean().optional(),
  confirm: z.boolean().optional(),
  publishDir: z.string().optional(),
})

/**
 * Changelog 选项 Schema
 */
const changelogOptionsSchema = z.object({
  enabled: z.boolean().optional(),
  conventional: z.boolean().optional(),
  output: z.string().optional(),
  template: z.string().optional(),
  includeAllCommits: z.boolean().optional(),
  types: z.array(z.object({
    type: z.string(),
    section: z.string().optional(),
    hidden: z.boolean().optional(),
    priority: z.number().optional(),
  })).optional(),
  groupByType: z.boolean().optional(),
  includeAuthors: z.boolean().optional(),
  includePRLinks: z.boolean().optional(),
  includeCommitHash: z.boolean().optional(),
  headerFormat: z.string().optional(),
  dateFormat: z.string().optional(),
  language: z.enum(['zh-CN', 'en-US', 'ja-JP']).optional(),
  sectionTitles: z.record(z.string()).optional(),
  regenerate: z.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

/**
 * 验证选项 Schema
 */
const validationOptionsSchema = z.object({
  requireCleanWorkingDirectory: z.boolean().optional(),
  allowedBranches: z.array(z.string()).optional(),
  requireTests: z.boolean().optional(),
  requireBuild: z.boolean().optional(),
  requireNpmCredentials: z.boolean().optional(),
  requiredFiles: z.array(z.string()).optional(),
  maxPackageSize: z.number().positive().optional(),
  scanSensitiveData: z.boolean().optional(),
  sensitivePatterns: z.array(z.string()).optional(),
  checkVersionConflict: z.boolean().optional(),
  customValidators: z.array(z.function()).optional(),
})

/**
 * Git 选项 Schema
 */
const gitOptionsSchema = z.object({
  createTag: z.boolean().optional(),
  tagPrefix: z.string().optional(),
  tagMessage: z.string().optional(),
  pushTag: z.boolean().optional(),
  createCommit: z.boolean().optional(),
  commitMessage: z.string().optional(),
  pushCommit: z.boolean().optional(),
  remote: z.string().optional(),
  signCommit: z.boolean().optional(),
  signTag: z.boolean().optional(),
  commitFiles: z.array(z.string()).optional(),
})

/**
 * Monorepo 选项 Schema
 */
const monorepoOptionsSchema = z.object({
  packages: z.array(z.string()).optional(),
  useWorkspaces: z.boolean().optional(),
  workspaceProtocol: z.enum(['pnpm', 'yarn', 'npm']).optional(),
  updateWorkspaceDependencies: z.boolean().optional(),
  filter: z.union([z.string(), z.array(z.string())]).optional(),
  ignorePrivate: z.boolean().optional(),
  topologicalSort: z.boolean().optional(),
  publishOrder: z.enum(['parallel', 'serial', 'auto']).optional(),
})

/**
 * 生命周期钩子 Schema
 */
const lifecycleHooksSchema = z.object({
  prePublish: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  postPublish: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  preVersion: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  postVersion: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  preChangelog: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  postChangelog: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  preValidate: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
  postValidate: z.union([z.string(), z.array(z.string()), z.function()]).optional(),
})

/**
 * 完整的 Publisher 配置 Schema
 */
const publisherConfigSchema = z.object({
  cwd: z.string().optional(),
  versionStrategy: z.enum(['fixed', 'independent']).optional(),
  registries: z.record(registryConfigSchema).optional(),
  defaultRegistry: z.string().optional(),
  publish: publishOptionsSchema.optional(),
  changelog: changelogOptionsSchema.optional(),
  validation: validationOptionsSchema.optional(),
  hooks: lifecycleHooksSchema.optional(),
  git: gitOptionsSchema.optional(),
  monorepo: monorepoOptionsSchema.optional(),
  concurrency: z.number().positive().optional(),
  debug: z.boolean().optional(),
  logLevel: z.enum(['silent', 'error', 'warn', 'info', 'debug', 'verbose']).optional(),
})

/**
 * 配置验证器类
 */
export class ConfigValidator {
  /**
   * 验证配置
   * 
   * @param config - 要验证的配置对象
   * @returns 验证结果
   * 
   * @example
   * ```typescript
   * const validator = new ConfigValidator()
   * const result = validator.validate({
   *   versionStrategy: 'independent',
   *   registries: {
   *     npm: { url: 'https://registry.npmjs.org' }
   *   }
   * })
   * 
   * if (!result.valid) {
   *   console.error(result.errors)
   * }
   * ```
   */
  validate(config: unknown): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: any[] = []

    try {
      // 使用 Zod 验证配置
      publisherConfigSchema.parse(config)

      // 额外的业务逻辑验证
      this.validateBusinessRules(config as PublisherConfig, errors, warnings)

      logger.debug('配置验证通过')
      return {
        valid: errors.length === 0,
        errors,
        warnings,
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        // 转换 Zod 错误为我们的错误格式
        for (const issue of error.issues) {
          errors.push({
            code: 'CONFIG_VALIDATION_ERROR',
            message: issue.message,
            details: {
              path: issue.path.join('.'),
              expected: issue.code,
            },
            suggestion: this.getSuggestion(issue),
          })
        }
      } else {
        errors.push({
          code: 'CONFIG_VALIDATION_ERROR',
          message: error.message,
        })
      }

      return {
        valid: false,
        errors,
        warnings,
      }
    }
  }

  /**
   * 验证业务规则
   * 
   * @param config - 配置对象
   * @param errors - 错误数组
   * @param warnings - 警告数组
   * @private
   */
  private validateBusinessRules(
    config: PublisherConfig,
    errors: ValidationError[],
    warnings: any[]
  ): void {
    // 验证 defaultRegistry 是否在 registries 中定义
    if (config.defaultRegistry && config.registries) {
      if (!config.registries[config.defaultRegistry]) {
        errors.push({
          code: 'INVALID_DEFAULT_REGISTRY',
          message: `默认 registry "${config.defaultRegistry}" 未在 registries 中定义`,
          suggestion: `请在 registries 中添加 "${config.defaultRegistry}" 的配置`,
        })
      }
    }

    // 验证并发数的合理性
    if (config.concurrency && config.concurrency > 10) {
      warnings.push({
        code: 'HIGH_CONCURRENCY',
        message: `并发数 ${config.concurrency} 过高，可能导致资源问题`,
        details: { concurrency: config.concurrency },
      })
    }

    // 验证 Git 配置的一致性
    if (config.git) {
      if (config.git.pushTag && !config.git.createTag) {
        warnings.push({
          code: 'INCONSISTENT_GIT_CONFIG',
          message: 'pushTag 为 true 但 createTag 为 false，tag 不会被推送',
        })
      }

      if (config.git.pushCommit && !config.git.createCommit) {
        warnings.push({
          code: 'INCONSISTENT_GIT_CONFIG',
          message: 'pushCommit 为 true 但 createCommit 为 false，commit 不会被推送',
        })
      }
    }

    // 验证发布配置
    if (config.publish) {
      if (config.publish.parallel && config.monorepo?.publishOrder === 'serial') {
        warnings.push({
          code: 'CONFLICTING_PUBLISH_CONFIG',
          message: 'publish.parallel 和 monorepo.publishOrder=serial 冲突',
        })
      }
    }

    // 验证验证选项
    if (config.validation) {
      if (config.validation.maxPackageSize && config.validation.maxPackageSize < 1024) {
        warnings.push({
          code: 'SMALL_PACKAGE_SIZE_LIMIT',
          message: `包大小限制 ${config.validation.maxPackageSize} bytes 过小`,
        })
      }
    }
  }

  /**
   * 获取错误建议
   * 
   * @param issue - Zod 错误问题
   * @returns 建议文本
   * @private
   */
  private getSuggestion(issue: z.ZodIssue): string {
    switch (issue.code) {
      case 'invalid_type':
        return `期望类型为 ${issue.expected}，但收到 ${issue.received}`
      case 'invalid_enum_value':
        return `有效值为: ${(issue as any).options?.join(', ')}`
      case 'invalid_string':
        return '字符串格式不正确'
      case 'too_small':
        return `值太小，最小值为 ${(issue as any).minimum}`
      case 'too_big':
        return `值太大，最大值为 ${(issue as any).maximum}`
      default:
        return '请检查配置文档以获取正确的配置格式'
    }
  }

  /**
   * 验证并抛出错误（如果验证失败）
   * 
   * @param config - 要验证的配置
   * @throws {ConfigError} 当配置无效时
   */
  validateOrThrow(config: unknown): void {
    const result = this.validate(config)

    if (!result.valid) {
      const errorMessages = result.errors!.map(e => `  - ${e.message}`).join('\n')
      throw new ConfigError(
        `配置验证失败:\n${errorMessages}`,
        { errors: result.errors },
        '请修复配置错误后重试'
      )
    }
  }

  /**
   * 生成默认配置
   * 
   * @returns 默认配置对象
   */
  generateDefaultConfig(): PublisherConfig {
    return {
      versionStrategy: 'independent',
      registries: {
        npm: {
          url: 'https://registry.npmjs.org',
          access: 'public',
        },
      },
      defaultRegistry: 'npm',
      publish: {
        access: 'public',
        tag: 'latest',
        dryRun: false,
        confirm: true,
      },
      changelog: {
        enabled: true,
        conventional: true,
        output: 'CHANGELOG.md',
        includeAuthors: true,
        includePRLinks: true,
      },
      validation: {
        requireCleanWorkingDirectory: true,
        allowedBranches: ['main', 'master'],
        scanSensitiveData: true,
        maxPackageSize: 10 * 1024 * 1024, // 10MB
      },
      git: {
        createTag: true,
        tagPrefix: 'v',
        pushTag: true,
        createCommit: true,
        pushCommit: true,
      },
      monorepo: {
        useWorkspaces: true,
        ignorePrivate: true,
        topologicalSort: true,
      },
      concurrency: 4,
      debug: false,
      logLevel: 'info',
    }
  }
}

/**
 * 创建配置验证器实例
 * 
 * @returns 配置验证器实例
 */
export function createConfigValidator(): ConfigValidator {
  return new ConfigValidator()
}

