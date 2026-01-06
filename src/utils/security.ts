/**
 * 安全工具
 * 
 * 提供发布前的安全检查功能：
 * - 敏感文件检测
 * - 敏感内容扫描
 * - 包完整性验证
 * - 依赖安全检查
 * 
 * @packageDocumentation
 */

import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import { createHash } from 'crypto'
import fg from 'fast-glob'
import { logger } from './logger.js'
import {
  SENSITIVE_FILE_PATTERNS,
  SENSITIVE_CONTENT_PATTERNS,
} from '../constants/index.js'

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
  '**/.netrc',
  '**/credentials*',
  '**/*.keystore',
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
  'bearer',
  'oauth',
  'jwt_secret',
  'encryption_key',
  'signing_key',
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

/**
 * 完整性检查结果
 */
export interface IntegrityCheckResult {
  /** 是否通过 */
  passed: boolean
  
  /** 文件哈希映射 */
  hashes: Map<string, string>
  
  /** 缺失的文件 */
  missingFiles: string[]
  
  /** 不匹配的文件 */
  mismatchedFiles: string[]
  
  /** 检查时间 */
  checkedAt: number
}

/**
 * 依赖安全检查结果
 */
export interface DependencySecurityResult {
  /** 是否安全 */
  safe: boolean
  
  /** 漏洞数量 */
  vulnerabilities: number
  
  /** 严重漏洞 */
  critical: number
  
  /** 高危漏洞 */
  high: number
  
  /** 中危漏洞 */
  moderate: number
  
  /** 低危漏洞 */
  low: number
  
  /** 详细信息 */
  details?: any[]
}

/**
 * 计算文件哈希
 * 
 * @param filePath - 文件路径
 * @param algorithm - 哈希算法（默认 sha256）
 * @returns 哈希字符串
 */
export async function calculateFileHash(
  filePath: string,
  algorithm: string = 'sha256'
): Promise<string> {
  const content = await readFile(filePath)
  return createHash(algorithm).update(content).digest('hex')
}

/**
 * 检查包完整性
 * 
 * 验证包中的文件是否完整，没有被篡改
 * 
 * @param cwd - 工作目录
 * @param expectedHashes - 预期的文件哈希映射（可选）
 * @returns 完整性检查结果
 */
export async function checkPackageIntegrity(
  cwd: string,
  expectedHashes?: Map<string, string>
): Promise<IntegrityCheckResult> {
  const result: IntegrityCheckResult = {
    passed: true,
    hashes: new Map(),
    missingFiles: [],
    mismatchedFiles: [],
    checkedAt: Date.now(),
  }
  
  // 获取包中的所有文件
  const files = await fg(['**/*'], {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
    dot: true,
  })
  
  // 计算每个文件的哈希
  for (const file of files) {
    const filePath = join(cwd, file)
    
    try {
      const fileStat = await stat(filePath)
      if (!fileStat.isFile()) continue
      
      const hash = await calculateFileHash(filePath)
      result.hashes.set(file, hash)
      
      // 如果提供了预期哈希，进行比对
      if (expectedHashes) {
        const expectedHash = expectedHashes.get(file)
        if (expectedHash && expectedHash !== hash) {
          result.mismatchedFiles.push(file)
          result.passed = false
        }
      }
    } catch (error: any) {
      logger.debug(`无法计算文件哈希: ${file} - ${error.message}`)
    }
  }
  
  // 检查缺失的文件
  if (expectedHashes) {
    for (const [file] of expectedHashes) {
      if (!result.hashes.has(file)) {
        result.missingFiles.push(file)
        result.passed = false
      }
    }
  }
  
  if (!result.passed) {
    if (result.missingFiles.length > 0) {
      logger.warn(`缺失文件: ${result.missingFiles.join(', ')}`)
    }
    if (result.mismatchedFiles.length > 0) {
      logger.warn(`文件哈希不匹配: ${result.mismatchedFiles.join(', ')}`)
    }
  }
  
  return result
}

/**
 * 检查依赖安全性
 * 
 * 使用 npm audit 检查已知漏洞
 * 
 * @param cwd - 工作目录
 * @returns 依赖安全检查结果
 */
export async function checkDependencySecurity(
  cwd: string
): Promise<DependencySecurityResult> {
  const { execa } = await import('execa')
  
  const result: DependencySecurityResult = {
    safe: true,
    vulnerabilities: 0,
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
  }
  
  try {
    const { stdout } = await execa('npm', ['audit', '--json'], {
      cwd,
      reject: false, // 不要抛出错误，因为 audit 发现漏洞时会返回非零退出码
    })
    
    const auditResult = JSON.parse(stdout)
    
    if (auditResult.metadata) {
      const { vulnerabilities } = auditResult.metadata
      
      result.critical = vulnerabilities?.critical || 0
      result.high = vulnerabilities?.high || 0
      result.moderate = vulnerabilities?.moderate || 0
      result.low = vulnerabilities?.low || 0
      result.vulnerabilities = result.critical + result.high + result.moderate + result.low
      result.safe = result.critical === 0 && result.high === 0
      result.details = auditResult.advisories ? Object.values(auditResult.advisories) : []
    }
    
    if (!result.safe) {
      logger.warn(`发现 ${result.vulnerabilities} 个安全漏洞:`)
      if (result.critical > 0) logger.error(`  严重: ${result.critical}`)
      if (result.high > 0) logger.warn(`  高危: ${result.high}`)
      if (result.moderate > 0) logger.info(`  中危: ${result.moderate}`)
      if (result.low > 0) logger.debug(`  低危: ${result.low}`)
    }
    
  } catch (error: any) {
    logger.debug(`依赖安全检查失败: ${error.message}`)
  }
  
  return result
}

/**
 * 使用正则模式扫描敏感内容
 * 
 * @param cwd - 工作目录
 * @param patterns - 正则模式数组
 * @returns 敏感内容结果
 */
export async function scanWithPatterns(
  cwd: string,
  patterns: RegExp[] = SENSITIVE_CONTENT_PATTERNS as unknown as RegExp[]
): Promise<SensitiveContentResult[]> {
  const results: SensitiveContentResult[] = []
  
  const files = await fg(['**/*.{js,ts,jsx,tsx,json,yaml,yml,env,config}'], {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
  })
  
  for (const file of files) {
    const filePath = join(cwd, file)
    
    try {
      const content = await readFile(filePath, 'utf-8')
      const lines = content.split('\n')
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        
        for (const pattern of patterns) {
          // 重置正则状态
          pattern.lastIndex = 0
          
          if (pattern.test(line)) {
            results.push({
              file,
              line: i + 1,
              content: line.trim().substring(0, 100), // 截断以避免泄露敏感信息
              keyword: pattern.source.substring(0, 30),
            })
            break // 每行只报告一次
          }
        }
      }
    } catch {
      // 忽略无法读取的文件
    }
  }
  
  return results
}

/**
 * 完整的安全检查
 * 
 * 执行所有安全检查并返回综合结果
 * 
 * @param cwd - 工作目录
 * @param options - 检查选项
 * @returns 综合安全检查结果
 */
export async function performSecurityAudit(
  cwd: string,
  options: {
    enableSensitiveFileCheck?: boolean
    enableSensitiveContentCheck?: boolean
    enableIgnoreFileCheck?: boolean
    enablePackageSizeCheck?: boolean
    enableDependencyCheck?: boolean
    maxPackageSize?: number
  } = {}
): Promise<{
  passed: boolean
  sensitiveFiles: string[]
  sensitiveContent: SensitiveContentResult[]
  ignoreValidation: ValidationResult | null
  packageSize: { size: number; exceeded: boolean } | null
  dependencySecurity: DependencySecurityResult | null
  summary: string
}> {
  const {
    enableSensitiveFileCheck = true,
    enableSensitiveContentCheck = true,
    enableIgnoreFileCheck = true,
    enablePackageSizeCheck = true,
    enableDependencyCheck = false, // 默认关闭，因为比较慢
    maxPackageSize: maxSize = 10 * 1024 * 1024,
  } = options
  
  const result = {
    passed: true,
    sensitiveFiles: [] as string[],
    sensitiveContent: [] as SensitiveContentResult[],
    ignoreValidation: null as ValidationResult | null,
    packageSize: null as { size: number; exceeded: boolean } | null,
    dependencySecurity: null as DependencySecurityResult | null,
    summary: '',
  }
  
  const issues: string[] = []
  
  // 检查敏感文件
  if (enableSensitiveFileCheck) {
    result.sensitiveFiles = await scanSensitiveFiles(cwd)
    if (result.sensitiveFiles.length > 0) {
      result.passed = false
      issues.push(`发现 ${result.sensitiveFiles.length} 个敏感文件`)
    }
  }
  
  // 检查敏感内容
  if (enableSensitiveContentCheck) {
    result.sensitiveContent = await scanSensitiveContent(cwd)
    if (result.sensitiveContent.length > 0) {
      result.passed = false
      issues.push(`发现 ${result.sensitiveContent.length} 处敏感内容`)
    }
  }
  
  // 检查 ignore 文件
  if (enableIgnoreFileCheck) {
    result.ignoreValidation = await validateIgnoreFile(cwd)
    if (!result.ignoreValidation.valid) {
      result.passed = false
      issues.push('ignore 文件配置不完整')
    }
  }
  
  // 检查包大小
  if (enablePackageSizeCheck) {
    result.packageSize = await checkPackageSize(cwd, maxSize)
    if (result.packageSize.exceeded) {
      result.passed = false
      issues.push(`包大小超过限制 (${(result.packageSize.size / 1024 / 1024).toFixed(2)}MB)`)
    }
  }
  
  // 检查依赖安全
  if (enableDependencyCheck) {
    result.dependencySecurity = await checkDependencySecurity(cwd)
    if (!result.dependencySecurity.safe) {
      // 不将依赖漏洞作为失败条件，只警告
      issues.push(`发现 ${result.dependencySecurity.vulnerabilities} 个依赖漏洞`)
    }
  }
  
  // 生成摘要
  if (result.passed) {
    result.summary = '✅ 安全检查通过'
  } else {
    result.summary = `❌ 安全检查未通过:\n${issues.map(i => `  - ${i}`).join('\n')}`
  }
  
  return result
}

