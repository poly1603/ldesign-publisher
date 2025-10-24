/**
 * Builder 集成
 */

import { execa } from 'execa'
import { existsSync } from 'fs'
import { join } from 'path'
import type { PackageInfo } from '../types/index.js'
import { logger } from '../utils/logger.js'

export interface BuilderIntegrationOptions {
  cwd?: string
  skipBuild?: boolean
  buildCommand?: string
}

/**
 * Builder 集成类
 */
export class BuilderIntegration {
  private options: Required<BuilderIntegrationOptions>

  constructor(options: BuilderIntegrationOptions = {}) {
    this.options = {
      cwd: options.cwd || process.cwd(),
      skipBuild: options.skipBuild || false,
      buildCommand: options.buildCommand || 'pnpm build',
      ...options,
    }
  }

  /**
   * 构建包
   */
  async build(pkg: PackageInfo): Promise<void> {
    if (this.options.skipBuild) {
      logger.info(`跳过构建: ${pkg.name}`)
      return
    }

    logger.info(`构建包: ${pkg.name}`)

    try {
      // 检查是否有构建脚本
      const hasBuildScript = pkg.packageJson.scripts?.build

      if (!hasBuildScript) {
        logger.warn(`包 ${pkg.name} 没有 build 脚本，跳过构建`)
        return
      }

      // 执行构建
      const [command, ...args] = this.options.buildCommand.split(' ')

      await execa(command, args, {
        cwd: pkg.path,
        stdio: 'inherit',
      })

      logger.success(`✓ ${pkg.name} 构建成功`)
    } catch (error: any) {
      throw new Error(`构建失败: ${error.message}`)
    }
  }

  /**
   * 验证构建产物
   */
  async validateBuild(pkg: PackageInfo): Promise<boolean> {
    logger.info(`验证构建产物: ${pkg.name}`)

    // 检查常见的构建输出目录
    const outputDirs = ['dist', 'lib', 'es', 'build']

    for (const dir of outputDirs) {
      const outputPath = join(pkg.path, dir)
      if (existsSync(outputPath)) {
        logger.success(`✓ 找到构建产物: ${dir}`)
        return true
      }
    }

    logger.warn(`未找到构建产物`)
    return false
  }

  /**
   * 批量构建
   */
  async buildAll(packages: PackageInfo[]): Promise<void> {
    logger.info(`批量构建 ${packages.length} 个包...`)

    for (const pkg of packages) {
      await this.build(pkg)
    }

    logger.success('所有包构建完成')
  }
}

/**
 * 创建 Builder 集成实例
 */
export function createBuilderIntegration(
  options: BuilderIntegrationOptions = {}
): BuilderIntegration {
  return new BuilderIntegration(options)
}

