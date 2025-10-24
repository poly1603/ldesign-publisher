/**
 * 安全工具
 */

import { readFile } from 'fs/promises'
import { join } from 'path'
import fg from 'fast-glob'
import { logger } from './logger.js'

/**
 * 敏感文件模式
 */
const DEFAULT_SENSITIVE_PATTERNS = [
  '**/.env',
  '**/.env.*',
  '**/secrets/**',
  '**/*.key',
  '**/*.pem',
  '**/*.p12',
  '**/*.pfx',
  '**/id_rsa',
  '**/id_dsa',
  '**/.npmrc',
  '**/.yarnrc',
]

/**
 * 敏感关键字
 */
const SENSITIVE_KEYWORDS = [
  'password',
  'secret',
  'api_key',
  'apikey',
  'access_token',
  'auth_token',
  'private_key',
  'client_secret',
  'aws_secret',
  'ssh_key',
]

/**
 * 扫描敏感文件
 */
export async function scanSensitiveFiles(
  cwd: string,
  patterns: string[] = DEFAULT_SENSITIVE_PATTERNS
): Promise<string[]> {
  const files = await fg(patterns, {
    cwd,
    dot: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  })

  if (files.length > 0) {
    logger.warn(`发现 ${files.length} 个敏感文件:`)
    for (const file of files) {
      logger.warn(`  - ${file}`)
    }
  }

  return files
}

/**
 * 扫描敏感内容
 */
export async function scanSensitiveContent(
  cwd: string,
  filePatterns: string[] = ['**/*.js', '**/*.ts', '**/*.json']
): Promise<SensitiveContentResult[]> {
  const results: SensitiveContentResult[] = []

  const files = await fg(filePatterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  })

  for (const file of files) {
    const filePath = join(cwd, file)
    const content = await readFile(filePath, 'utf-8')
    const lines = content.split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase()

      for (const keyword of SENSITIVE_KEYWORDS) {
        if (line.includes(keyword)) {
          // 检查是否在注释中
          const trimmed = lines[i].trim()
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
            continue
          }

          // 检查是否看起来像真实的密钥
          if (looksLikeSensitiveValue(lines[i])) {
            results.push({
              file,
              line: i + 1,
              content: lines[i].trim(),
              keyword,
            })
          }
        }
      }
    }
  }

  if (results.length > 0) {
    logger.warn(`发现 ${results.length} 个可疑的敏感内容:`)
    for (const result of results) {
      logger.warn(`  ${result.file}:${result.line} - ${result.keyword}`)
    }
  }

  return results
}

/**
 * 检查是否看起来像敏感值
 */
function looksLikeSensitiveValue(line: string): boolean {
  // 检查是否有赋值操作
  if (!line.includes('=')) {
    return false
  }

  // 提取值部分
  const parts = line.split('=')
  if (parts.length < 2) {
    return false
  }

  const value = parts[1].trim()

  // 检查是否为空或占位符
  if (!value || value === '""' || value === "''" || value === 'null' || value === 'undefined') {
    return false
  }

  // 检查是否为示例值
  if (value.includes('YOUR_') || value.includes('REPLACE_') || value.includes('EXAMPLE_')) {
    return false
  }

  // 检查是否为环境变量引用
  if (value.includes('process.env') || value.startsWith('$')) {
    return false
  }

  // 看起来像真实的密钥
  return true
}

/**
 * 验证 .npmignore 或 .gitignore
 */
export async function validateIgnoreFile(cwd: string): Promise<ValidationResult> {
  const issues: string[] = []
  const warnings: string[] = []

  // 检查 .npmignore
  const npmignorePath = join(cwd, '.npmignore')
  const gitignorePath = join(cwd, '.gitignore')

  let ignoreContent = ''

  try {
    ignoreContent = await readFile(npmignorePath, 'utf-8')
  } catch {
    try {
      ignoreContent = await readFile(gitignorePath, 'utf-8')
      warnings.push('未找到 .npmignore，使用 .gitignore')
    } catch {
      issues.push('未找到 .npmignore 或 .gitignore')
    }
  }

  if (ignoreContent) {
    const lines = ignoreContent.split('\n').map(l => l.trim())

    // 检查是否忽略了敏感文件
    const requiredIgnores = ['.env', '*.key', '*.pem']
    for (const pattern of requiredIgnores) {
      if (!lines.some(line => line === pattern || line.includes(pattern))) {
        warnings.push(`建议在 ignore 文件中添加: ${pattern}`)
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  }
}

/**
 * 检查包大小
 */
export async function checkPackageSize(
  cwd: string,
  maxSize: number = 10 * 1024 * 1024 // 10MB
): Promise<{ size: number; exceeded: boolean }> {
  const { execa } = await import('execa')

  try {
    const { stdout } = await execa('npm', ['pack', '--dry-run', '--json'], {
      cwd,
    })

    const result = JSON.parse(stdout)
    const size = result[0]?.size || 0
    const exceeded = size > maxSize

    if (exceeded) {
      logger.warn(`包大小 ${(size / 1024 / 1024).toFixed(2)}MB 超过限制 ${(maxSize / 1024 / 1024).toFixed(2)}MB`)
    }

    return { size, exceeded }
  } catch (error) {
    logger.error('检查包大小失败', error)
    return { size: 0, exceeded: false }
  }
}

/**
 * 敏感内容结果
 */
export interface SensitiveContentResult {
  file: string
  line: number
  content: string
  keyword: string
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean
  issues: string[]
  warnings: string[]
}

