/**
 * Dry-run 分析器
 * 
 * 提供详细的发布预览和分析：
 * - 将要发布的文件列表
 * - 包大小估算
 * - 发布时间估算
 * - 潜在问题检测
 */

import { execSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { resolve } from 'node:path'
import { logger } from './logger.js'
import type { PackageInfo } from '../types/package.js'

/**
 * Dry-run 分析结果
 */
export interface DryRunAnalysis {
  /** 包信息 */
  package: PackageInfo

  /** 将要发布的文件 */
  files: FileInfo[]

  /** 包大小信息 */
  size: SizeInfo

  /** 时间估算 */
  timing: TimingEstimate

  /** 潜在问题 */
  issues: DryRunIssue[]

  /** 建议 */
  suggestions: string[]

  /** 统计摘要 */
  summary: string
}

/**
 * 文件信息
 */
export interface FileInfo {
  /** 文件路径 */
  path: string

  /** 文件大小 (bytes) */
  size: number

  /** 文件类型 */
  type: string

  /** 是否为源码 */
  isSourceCode: boolean
}

/**
 * 包大小信息
 */
export interface SizeInfo {
  /** 总大小 (bytes) */
  total: number

  /** 格式化的大小 */
  formatted: string

  /** 文件数量 */
  fileCount: number

  /** 按类型分类的大小 */
  byType: Record<string, number>

  /** 最大的文件 */
  largestFiles: FileInfo[]

  /** 是否超过建议大小 */
  exceedsRecommended: boolean
}

/**
 * 时间估算
 */
export interface TimingEstimate {
  /** 预计上传时间 (ms) */
  uploadTime: number

  /** 预计处理时间 (ms) */
  processingTime: number

  /** 预计总时间 (ms) */
  totalTime: number

  /** 格式化的时间 */
  formatted: string
}

/**
 * Dry-run 问题
 */
export interface DryRunIssue {
  /** 严重级别 */
  severity: 'error' | 'warning' | 'info'

  /** 问题类型 */
  type: string

  /** 问题描述 */
  message: string

  /** 受影响的文件 */
  files?: string[]

  /** 建议 */
  suggestion?: string
}

/**
 * Dry-run 分析器
 */
export class DryRunAnalyzer {
  private cwd: string
  private readonly RECOMMENDED_SIZE = 10 * 1024 * 1024 // 10MB
  private readonly UPLOAD_SPEED = 1024 * 1024 // 1MB/s

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd
  }

  /**
   * 分析包
   */
  async analyze(packageInfo: PackageInfo): Promise<DryRunAnalysis> {
    logger.debug(`分析包: ${packageInfo.name}`)

    // 获取将要发布的文件
    const files = await this.getPublishFiles(packageInfo)

    // 分析包大小
    const size = this.analyzeSizeInfo(files)

    // 估算时间
    const timing = this.estimateTiming(size.total)

    // 检测潜在问题
    const issues = this.detectIssues(files, size, packageInfo)

    // 生成建议
    const suggestions = this.generateSuggestions(issues, size)

    // 生成摘要
    const summary = this.generateSummary(files.length, size, timing, issues)

    return {
      package: packageInfo,
      files,
      size,
      timing,
      issues,
      suggestions,
      summary,
    }
  }

  /**
   * 获取将要发布的文件
   */
  private async getPublishFiles(packageInfo: PackageInfo): Promise<FileInfo[]> {
    try {
      // 使用 npm pack --dry-run 获取文件列表
      const output = execSync('npm pack --dry-run --json', {
        cwd: packageInfo.location,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })

      const packData = JSON.parse(output)
      const files: FileInfo[] = []

      if (packData[0]?.files) {
        for (const file of packData[0].files) {
          const filePath = resolve(packageInfo.location, file.path)
          
          try {
            const stats = statSync(filePath)
            files.push({
              path: file.path,
              size: stats.size,
              type: this.getFileType(file.path),
              isSourceCode: this.isSourceCode(file.path),
            })
          } catch {
            // 文件可能不存在，跳过
          }
        }
      }

      return files.sort((a, b) => b.size - a.size)
    } catch (error: any) {
      logger.warn(`无法获取发布文件列表: ${error.message}`)
      return []
    }
  }

  /**
   * 分析包大小信息
   */
  private analyzeSizeInfo(files: FileInfo[]): SizeInfo {
    const total = files.reduce((sum, file) => sum + file.size, 0)
    const byType: Record<string, number> = {}

    // 按类型统计
    for (const file of files) {
      byType[file.type] = (byType[file.type] || 0) + file.size
    }

    // 获取最大的 5 个文件
    const largestFiles = files.slice(0, 5)

    return {
      total,
      formatted: this.formatSize(total),
      fileCount: files.length,
      byType,
      largestFiles,
      exceedsRecommended: total > this.RECOMMENDED_SIZE,
    }
  }

  /**
   * 估算时间
   */
  private estimateTiming(totalSize: number): TimingEstimate {
    // 上传时间：根据大小和网速
    const uploadTime = (totalSize / this.UPLOAD_SPEED) * 1000

    // 处理时间：固定 2-5 秒
    const processingTime = 3000

    const totalTime = uploadTime + processingTime

    return {
      uploadTime,
      processingTime,
      totalTime,
      formatted: this.formatTime(totalTime),
    }
  }

  /**
   * 检测潜在问题
   */
  private detectIssues(
    files: FileInfo[],
    size: SizeInfo,
    packageInfo: PackageInfo,
  ): DryRunIssue[] {
    const issues: DryRunIssue[] = []

    // 1. 检查包大小
    if (size.total > this.RECOMMENDED_SIZE) {
      issues.push({
        severity: 'warning',
        type: 'size',
        message: `包大小 ${size.formatted} 超过推荐大小 10MB`,
        suggestion: '考虑优化资源文件或排除不必要的文件',
      })
    }

    // 2. 检查源码文件
    const sourceFiles = files.filter((f) => f.isSourceCode)
    if (sourceFiles.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'source-code',
        message: `包含 ${sourceFiles.length} 个源码文件`,
        files: sourceFiles.map((f) => f.path).slice(0, 5),
        suggestion: '确认是否需要发布源码，考虑使用 .npmignore 排除',
      })
    }

    // 3. 检查大文件
    const largeFiles = files.filter((f) => f.size > 1024 * 1024) // > 1MB
    if (largeFiles.length > 0) {
      issues.push({
        severity: 'info',
        type: 'large-files',
        message: `包含 ${largeFiles.length} 个大文件 (>1MB)`,
        files: largeFiles.map((f) => `${f.path} (${this.formatSize(f.size)})`),
      })
    }

    // 4. 检查敏感文件
    const sensitivePatterns = ['.env', '.key', '.pem', 'id_rsa', 'secrets']
    const sensitiveFiles = files.filter((f) =>
      sensitivePatterns.some((pattern) => f.path.toLowerCase().includes(pattern))
    )
    if (sensitiveFiles.length > 0) {
      issues.push({
        severity: 'error',
        type: 'sensitive-files',
        message: '检测到可能的敏感文件',
        files: sensitiveFiles.map((f) => f.path),
        suggestion: '立即从发布中排除这些文件',
      })
    }

    // 5. 检查 node_modules
    const nodeModulesFiles = files.filter((f) => f.path.includes('node_modules'))
    if (nodeModulesFiles.length > 0) {
      issues.push({
        severity: 'warning',
        type: 'node-modules',
        message: '包含 node_modules 文件',
        files: nodeModulesFiles.map((f) => f.path).slice(0, 3),
        suggestion: '检查 .npmignore 配置',
      })
    }

    // 6. 检查测试文件
    const testFiles = files.filter(
      (f) =>
        f.path.includes('test') ||
        f.path.includes('spec') ||
        f.path.includes('__tests__')
    )
    if (testFiles.length > 10) {
      issues.push({
        severity: 'info',
        type: 'test-files',
        message: `包含 ${testFiles.length} 个测试文件`,
        suggestion: '考虑是否需要发布测试文件',
      })
    }

    // 7. 检查必需文件
    const hasReadme = files.some((f) => f.path.toLowerCase().includes('readme'))
    if (!hasReadme) {
      issues.push({
        severity: 'warning',
        type: 'missing-readme',
        message: '缺少 README 文件',
        suggestion: '添加 README.md 提供使用说明',
      })
    }

    const hasLicense = files.some((f) => f.path.toLowerCase().includes('license'))
    if (!hasLicense) {
      issues.push({
        severity: 'info',
        type: 'missing-license',
        message: '缺少 LICENSE 文件',
        suggestion: '添加开源许可证',
      })
    }

    return issues
  }

  /**
   * 生成建议
   */
  private generateSuggestions(issues: DryRunIssue[], size: SizeInfo): string[] {
    const suggestions: string[] = []

    // 根据问题生成建议
    const errors = issues.filter((i) => i.severity === 'error')
    if (errors.length > 0) {
      suggestions.push('⚠️  请先修复所有错误级别的问题再发布')
    }

    // 大小优化建议
    if (size.exceedsRecommended) {
      suggestions.push('💡 优化包大小可以提升下载速度和用户体验')
      
      const typeSizes = Object.entries(size.byType).sort((a, b) => b[1] - a[1])
      if (typeSizes.length > 0) {
        const largest = typeSizes[0]
        suggestions.push(
          `   最大的文件类型是 ${largest[0]} (${this.formatSize(largest[1])})`
        )
      }
    }

    // 通用建议
    if (issues.length === 0) {
      suggestions.push('✅ 未发现明显问题，可以安全发布')
    }

    return suggestions
  }

  /**
   * 生成摘要
   */
  private generateSummary(
    fileCount: number,
    size: SizeInfo,
    timing: TimingEstimate,
    issues: DryRunIssue[],
  ): string {
    const errors = issues.filter((i) => i.severity === 'error').length
    const warnings = issues.filter((i) => i.severity === 'warning').length

    return `将发布 ${fileCount} 个文件，总大小 ${size.formatted}，预计耗时 ${timing.formatted}。${
      errors > 0 ? `发现 ${errors} 个错误，` : ''
    }${warnings > 0 ? `${warnings} 个警告。` : '未发现问题。'}`
  }

  /**
   * 获取文件类型
   */
  private getFileType(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase() || 'unknown'
    
    const typeMap: Record<string, string> = {
      js: 'JavaScript',
      ts: 'TypeScript',
      jsx: 'React',
      tsx: 'React',
      json: 'JSON',
      md: 'Markdown',
      css: 'CSS',
      scss: 'SCSS',
      html: 'HTML',
      png: 'Image',
      jpg: 'Image',
      svg: 'Image',
      woff: 'Font',
      woff2: 'Font',
      ttf: 'Font',
    }

    return typeMap[ext] || ext.toUpperCase()
  }

  /**
   * 是否为源码
   */
  private isSourceCode(path: string): boolean {
    return /\.(ts|tsx|jsx)$/.test(path) && !path.includes('.d.ts')
  }

  /**
   * 格式化大小
   */
  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  /**
   * 格式化时间
   */
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)} ms`
    return `${(ms / 1000).toFixed(1)} s`
  }

  /**
   * 打印分析报告
   */
  printReport(analysis: DryRunAnalysis): void {
    const { package: pkg, files, size, timing, issues, suggestions } = analysis

    console.log('\n' + '='.repeat(60))
    console.log(`📦 ${pkg.name}@${pkg.version} - Dry-run 分析报告`)
    console.log('='.repeat(60))

    // 1. 基本信息
    console.log('\n📊 基本信息:')
    console.log(`  文件数量: ${files.length}`)
    console.log(`  总大小: ${size.formatted}`)
    console.log(`  预计耗时: ${timing.formatted}`)

    // 2. 文件类型分布
    console.log('\n📁 文件类型分布:')
    const sortedTypes = Object.entries(size.byType).sort((a, b) => b[1] - a[1])
    sortedTypes.forEach(([type, bytes]) => {
      const percentage = ((bytes / size.total) * 100).toFixed(1)
      console.log(`  ${type}: ${this.formatSize(bytes)} (${percentage}%)`)
    })

    // 3. 最大文件
    if (size.largestFiles.length > 0) {
      console.log('\n📈 最大文件 (Top 5):')
      size.largestFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.path} - ${this.formatSize(file.size)}`)
      })
    }

    // 4. 潜在问题
    if (issues.length > 0) {
      console.log('\n⚠️  潜在问题:')
      issues.forEach((issue) => {
        const icon =
          issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
        console.log(`  ${icon} [${issue.type}] ${issue.message}`)
        if (issue.files && issue.files.length > 0) {
          issue.files.forEach((file) => {
            console.log(`     - ${file}`)
          })
        }
        if (issue.suggestion) {
          console.log(`     💡 ${issue.suggestion}`)
        }
      })
    }

    // 5. 建议
    if (suggestions.length > 0) {
      console.log('\n💡 建议:')
      suggestions.forEach((suggestion) => {
        console.log(`  ${suggestion}`)
      })
    }

    console.log('\n' + '='.repeat(60) + '\n')
  }
}

/**
 * 创建 Dry-run 分析器
 */
export function createDryRunAnalyzer(cwd?: string): DryRunAnalyzer {
  return new DryRunAnalyzer(cwd)
}
