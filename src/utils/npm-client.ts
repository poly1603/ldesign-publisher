/**
 * NPM 客户端封装
 */

import { execa } from 'execa'
import { logger } from './logger.js'
import { RegistryError } from './error-handler.js'

export interface NpmClientOptions {
  cwd?: string
  registry?: string
  token?: string
  tag?: string
  otp?: string
  dryRun?: boolean
  silent?: boolean
}

/**
 * NPM 客户端
 */
export class NpmClient {
  private options: NpmClientOptions

  constructor(options: NpmClientOptions = {}) {
    this.options = options
  }

  /**
   * 执行 npm 命令
   */
  private async exec(args: string[], options: NpmClientOptions = {}): Promise<string> {
    const mergedOptions = { ...this.options, ...options }
    const { cwd, registry, token, silent } = mergedOptions

    const env: Record<string, string> = { ...process.env }

    // 设置 registry
    if (registry) {
      env.npm_config_registry = registry
    }

    // 设置 token
    if (token) {
      const registryUrl = registry || 'https://registry.npmjs.org'
      const registryHost = new URL(registryUrl).hostname
      env[`npm_config_${registryHost}:_authToken`] = token
    }

    try {
      const result = await execa('npm', args, {
        cwd: cwd || process.cwd(),
        env,
        stdout: silent ? 'pipe' : 'inherit',
        stderr: silent ? 'pipe' : 'inherit',
      })
      return result.stdout
    } catch (error: any) {
      throw new RegistryError(
        `NPM 命令执行失败: ${error.message}`,
        { command: `npm ${args.join(' ')}`, error: error.message },
        '请检查网络连接和 npm 配置'
      )
    }
  }

  /**
   * 发布包
   */
  async publish(packagePath?: string, options: NpmClientOptions = {}): Promise<void> {
    const { tag, otp, dryRun, registry } = { ...this.options, ...options }

    const args = ['publish']

    if (packagePath) {
      args.push(packagePath)
    }

    if (tag) {
      args.push('--tag', tag)
    }

    if (otp) {
      args.push('--otp', otp)
    }

    if (dryRun) {
      args.push('--dry-run')
    }

    if (registry) {
      args.push('--registry', registry)
    }

    args.push('--access', 'public')

    logger.verbose(`执行命令: npm ${args.join(' ')}`)
    await this.exec(args, options)
  }

  /**
   * 撤销发布
   */
  async unpublish(packageName: string, version?: string, options: NpmClientOptions = {}): Promise<void> {
    const args = ['unpublish']

    if (version) {
      args.push(`${packageName}@${version}`)
    } else {
      args.push(packageName)
    }

    args.push('--force')

    logger.verbose(`执行命令: npm ${args.join(' ')}`)
    await this.exec(args, options)
  }

  /**
   * 废弃版本
   */
  async deprecate(packageName: string, version: string, message: string, options: NpmClientOptions = {}): Promise<void> {
    const args = ['deprecate', `${packageName}@${version}`, message]

    logger.verbose(`执行命令: npm ${args.join(' ')}`)
    await this.exec(args, options)
  }

  /**
   * 查看包信息
   */
  async view(packageName: string, field?: string, options: NpmClientOptions = {}): Promise<any> {
    const args = ['view', packageName]

    if (field) {
      args.push(field)
    }

    args.push('--json')

    const output = await this.exec(args, { ...options, silent: true })

    try {
      return JSON.parse(output)
    } catch {
      return output
    }
  }

  /**
   * 检查版本是否存在
   */
  async versionExists(packageName: string, version: string, options: NpmClientOptions = {}): Promise<boolean> {
    try {
      const versions = await this.view(packageName, 'versions', options)
      return Array.isArray(versions) && versions.includes(version)
    } catch {
      return false
    }
  }

  /**
   * 获取包的最新版本
   */
  async getLatestVersion(packageName: string, options: NpmClientOptions = {}): Promise<string | null> {
    try {
      const version = await this.view(packageName, 'version', options)
      return version || null
    } catch {
      return null
    }
  }

  /**
   * 获取包的所有版本
   */
  async getVersions(packageName: string, options: NpmClientOptions = {}): Promise<string[]> {
    try {
      const versions = await this.view(packageName, 'versions', options)
      return Array.isArray(versions) ? versions : []
    } catch {
      return []
    }
  }

  /**
   * 检查包是否存在
   */
  async packageExists(packageName: string, options: NpmClientOptions = {}): Promise<boolean> {
    try {
      await this.view(packageName, 'name', options)
      return true
    } catch {
      return false
    }
  }

  /**
   * 登录检查
   */
  async whoami(options: NpmClientOptions = {}): Promise<string | null> {
    try {
      const output = await this.exec(['whoami'], { ...options, silent: true })
      return output.trim()
    } catch {
      return null
    }
  }

  /**
   * 打包
   */
  async pack(options: NpmClientOptions = {}): Promise<string> {
    const output = await this.exec(['pack', '--json'], { ...options, silent: true })

    try {
      const result = JSON.parse(output)
      return result[0]?.filename || ''
    } catch {
      return ''
    }
  }

  /**
   * 获取 tarball 大小
   */
  async getTarballSize(packagePath?: string, options: NpmClientOptions = {}): Promise<number> {
    const packInfo = await this.pack({ ...options, cwd: packagePath })

    try {
      const info = JSON.parse(packInfo)
      return info[0]?.size || 0
    } catch {
      return 0
    }
  }
}

/**
 * 创建 NPM 客户端实例
 */
export function createNpmClient(options: NpmClientOptions = {}): NpmClient {
  return new NpmClient(options)
}

