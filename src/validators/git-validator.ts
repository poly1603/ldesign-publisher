/**
 * Git 验证器
 */

import type { ValidationResult, ValidationError } from '../types/index.js'
import { createGitUtils } from '../utils/git-utils.js'
import { logger } from '../utils/logger.js'

export interface GitValidatorOptions {
  cwd?: string
  requireCleanWorkingDirectory?: boolean
  allowedBranches?: string[]
}

/**
 * Git 验证器
 */
export class GitValidator {
  private gitUtils: ReturnType<typeof createGitUtils>
  private options: Required<GitValidatorOptions>

  constructor(options: GitValidatorOptions = {}) {
    this.gitUtils = createGitUtils({ cwd: options.cwd })
    this.options = {
      cwd: options.cwd || process.cwd(),
      requireCleanWorkingDirectory: true,
      allowedBranches: ['main', 'master'],
      ...options,
    }
  }

  /**
   * 验证 Git 状态
   */
  async validate(): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: any[] = []

    logger.info('验证 Git 状态...')

    // 检查是否为 Git 仓库
    const isGitRepo = await this.gitUtils.isGitRepository()
    if (!isGitRepo) {
      errors.push({
        code: 'NOT_GIT_REPOSITORY',
        message: '当前目录不是 Git 仓库',
        suggestion: '请在 Git 仓库中运行此命令',
      })
      return { valid: false, errors, warnings }
    }

    // 检查工作区是否干净
    if (this.options.requireCleanWorkingDirectory) {
      const isClean = await this.gitUtils.isWorkingDirectoryClean()
      if (!isClean) {
        errors.push({
          code: 'DIRTY_WORKING_DIRECTORY',
          message: 'Git 工作区不干净，存在未提交的更改',
          suggestion: '请先提交或暂存更改',
        })
      }
    }

    // 检查当前分支
    const currentBranch = await this.gitUtils.getCurrentBranch()
    if (this.options.allowedBranches.length > 0) {
      if (!this.options.allowedBranches.includes(currentBranch)) {
        errors.push({
          code: 'INVALID_BRANCH',
          message: `当前分支 "${currentBranch}" 不在允许的分支列表中`,
          details: { currentBranch, allowedBranches: this.options.allowedBranches },
          suggestion: `请切换到以下分支之一: ${this.options.allowedBranches.join(', ')}`,
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }
}

