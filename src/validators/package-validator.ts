/**
 * 包验证器
 */

import { existsSync } from 'fs'
import { join } from 'path'
import type { PackageInfo, ValidationResult, ValidationError } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { scanSensitiveFiles, scanSensitiveContent, checkPackageSize } from '../utils/security.js'

export interface PackageValidatorOptions {
  requiredFiles?: string[]
  maxPackageSize?: number
  scanSensitiveData?: boolean
}

/**
 * 包验证器
 */
export class PackageValidator {
  private options: Required<PackageValidatorOptions>

  constructor(options: PackageValidatorOptions = {}) {
    this.options = {
      requiredFiles: ['README.md', 'LICENSE'],
      maxPackageSize: 10 * 1024 * 1024, // 10MB
      scanSensitiveData: true,
      ...options,
    }
  }

  /**
   * 验证包
   */
  async validate(pkg: PackageInfo): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: any[] = []

    logger.info(`验证包: ${pkg.name}`)

    // 验证 package.json 字段
    this.validatePackageJson(pkg, errors)

    // 验证必需文件
    this.validateRequiredFiles(pkg, errors)

    // 验证包大小
    await this.validatePackageSize(pkg, warnings)

    // 扫描敏感信息
    if (this.options.scanSensitiveData) {
      await this.scanSensitive(pkg, warnings)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 验证 package.json
   */
  private validatePackageJson(pkg: PackageInfo, errors: ValidationError[]): void {
    const { packageJson } = pkg

    // 必需字段
    if (!packageJson.name) {
      errors.push({
        code: 'MISSING_NAME',
        message: '缺少 name 字段',
      })
    }

    if (!packageJson.version) {
      errors.push({
        code: 'MISSING_VERSION',
        message: '缺少 version 字段',
      })
    }

    // 推荐字段
    if (!packageJson.description) {
      logger.warn(`包 ${pkg.name} 缺少 description 字段`)
    }

    if (!packageJson.license) {
      logger.warn(`包 ${pkg.name} 缺少 license 字段`)
    }
  }

  /**
   * 验证必需文件
   */
  private validateRequiredFiles(pkg: PackageInfo, errors: ValidationError[]): void {
    for (const file of this.options.requiredFiles) {
      const filePath = join(pkg.path, file)
      if (!existsSync(filePath)) {
        errors.push({
          code: 'MISSING_FILE',
          message: `缺少必需文件: ${file}`,
          suggestion: `请在包目录中添加 ${file} 文件`,
        })
      }
    }
  }

  /**
   * 验证包大小
   */
  private async validatePackageSize(pkg: PackageInfo, warnings: any[]): Promise<void> {
    const { size, exceeded } = await checkPackageSize(pkg.path, this.options.maxPackageSize)

    if (exceeded) {
      warnings.push({
        code: 'PACKAGE_SIZE_EXCEEDED',
        message: `包大小超出限制: ${(size / 1024 / 1024).toFixed(2)}MB`,
      })
    }
  }

  /**
   * 扫描敏感信息
   */
  private async scanSensitive(pkg: PackageInfo, warnings: any[]): Promise<void> {
    const sensitiveFiles = await scanSensitiveFiles(pkg.path)

    if (sensitiveFiles.length > 0) {
      warnings.push({
        code: 'SENSITIVE_FILES',
        message: `发现 ${sensitiveFiles.length} 个敏感文件`,
        details: sensitiveFiles,
      })
    }
  }
}

