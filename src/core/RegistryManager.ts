/**
 * Registry 管理器
 */

import { homedir } from 'os'
import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { RegistryConfig } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { RegistryError } from '../utils/error-handler.js'
import { createNpmClient } from '../utils/npm-client.js'

export interface RegistryManagerOptions {
  cwd?: string
  registries?: Record<string, RegistryConfig>
  defaultRegistry?: string
}

/**
 * Registry 管理器
 */
export class RegistryManager {
  private cwd: string
  private registries: Map<string, RegistryConfig>
  private defaultRegistry: string
  private npmrcPath: string

  constructor(options: RegistryManagerOptions = {}) {
    this.cwd = options.cwd || process.cwd()
    this.registries = new Map()
    this.defaultRegistry = options.defaultRegistry || 'npm'
    this.npmrcPath = join(homedir(), '.npmrc')

    // 添加默认 registries
    this.addRegistry('npm', {
      url: 'https://registry.npmjs.org',
      access: 'public',
    })

    // 添加自定义 registries
    if (options.registries) {
      for (const [name, config] of Object.entries(options.registries)) {
        this.addRegistry(name, config)
      }
    }

    // 从 .npmrc 加载配置
    this.loadFromNpmrc().catch(err => {
      logger.debug('从 .npmrc 加载配置失败:', err.message)
    })
  }

  /**
   * 添加 registry
   */
  addRegistry(name: string, config: RegistryConfig): void {
    this.registries.set(name, config)
    logger.debug(`添加 registry: ${name} -> ${config.url}`)
  }

  /**
   * 获取 registry
   */
  getRegistry(name?: string): RegistryConfig {
    const registryName = name || this.defaultRegistry
    const registry = this.registries.get(registryName)

    if (!registry) {
      throw new RegistryError(
        `Registry 未找到: ${registryName}`,
        { name: registryName },
        '请检查配置文件中的 registry 设置'
      )
    }

    return registry
  }

  /**
   * 列出所有 registries
   */
  listRegistries(): Array<{ name: string; config: RegistryConfig }> {
    return Array.from(this.registries.entries()).map(([name, config]) => ({
      name,
      config,
    }))
  }

  /**
   * 设置默认 registry
   */
  setDefaultRegistry(name: string): void {
    if (!this.registries.has(name)) {
      throw new RegistryError(
        `Registry 未找到: ${name}`,
        { name },
        '请先使用 addRegistry 添加 registry'
      )
    }

    this.defaultRegistry = name
    logger.info(`设置默认 registry: ${name}`)
  }

  /**
   * 获取默认 registry
   */
  getDefaultRegistry(): RegistryConfig {
    return this.getRegistry(this.defaultRegistry)
  }

  /**
   * 从 .npmrc 加载配置
   */
  private async loadFromNpmrc(): Promise<void> {
    if (!existsSync(this.npmrcPath)) {
      logger.debug('.npmrc 文件不存在')
      return
    }

    try {
      const content = await readFile(this.npmrcPath, 'utf-8')
      const lines = content.split('\n')

      let currentRegistry = ''
      let currentToken = ''

      for (const line of lines) {
        const trimmed = line.trim()

        // 跳过注释和空行
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
          continue
        }

        // 解析 registry
        if (trimmed.startsWith('registry=')) {
          currentRegistry = trimmed.split('=')[1]
        }

        // 解析 token
        if (trimmed.includes(':_authToken=')) {
          currentToken = trimmed.split('=')[1]
        }
      }

      // 更新默认 registry 的 token
      if (currentToken) {
        const defaultReg = this.registries.get(this.defaultRegistry)
        if (defaultReg) {
          defaultReg.token = currentToken
        }
      }

      logger.debug('从 .npmrc 加载配置成功')
    } catch (error: any) {
      logger.warn('加载 .npmrc 失败:', error.message)
    }
  }

  /**
   * 保存 token 到 .npmrc
   */
  async saveTokenToNpmrc(registryUrl: string, token: string): Promise<void> {
    try {
      let content = ''

      if (existsSync(this.npmrcPath)) {
        content = await readFile(this.npmrcPath, 'utf-8')
      }

      const registryHost = new URL(registryUrl).hostname
      const tokenLine = `//${registryHost}/:_authToken=${token}`

      const lines = content.split('\n')
      const existingIndex = lines.findIndex(line => line.includes(`//${registryHost}/:_authToken=`))

      if (existingIndex >= 0) {
        lines[existingIndex] = tokenLine
      } else {
        lines.push(tokenLine)
      }

      await writeFile(this.npmrcPath, lines.join('\n'), 'utf-8')
      logger.success(`Token 已保存到 .npmrc`)
    } catch (error: any) {
      throw new RegistryError(
        `保存 token 失败: ${error.message}`,
        { registryUrl, error: error.message },
        '请检查 .npmrc 文件权限'
      )
    }
  }

  /**
   * 移除 .npmrc 中的 token
   */
  async removeTokenFromNpmrc(registryUrl: string): Promise<void> {
    try {
      if (!existsSync(this.npmrcPath)) {
        return
      }

      const content = await readFile(this.npmrcPath, 'utf-8')
      const registryHost = new URL(registryUrl).hostname

      const lines = content.split('\n').filter(line => {
        return !line.includes(`//${registryHost}/:_authToken=`)
      })

      await writeFile(this.npmrcPath, lines.join('\n'), 'utf-8')
      logger.success(`Token 已从 .npmrc 移除`)
    } catch (error: any) {
      logger.warn('移除 token 失败:', error.message)
    }
  }

  /**
   * 验证 registry 连接
   */
  async validateRegistry(name?: string): Promise<boolean> {
    const registry = this.getRegistry(name)
    const client = createNpmClient({
      registry: registry.url,
      token: registry.token,
    })

    try {
      await client.whoami()
      logger.success(`Registry 连接成功: ${registry.url}`)
      return true
    } catch (error) {
      logger.error(`Registry 连接失败: ${registry.url}`)
      return false
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuth(name?: string): Promise<string | null> {
    const registry = this.getRegistry(name)
    const client = createNpmClient({
      registry: registry.url,
      token: registry.token,
    })

    try {
      const username = await client.whoami()
      if (username) {
        logger.info(`已登录为: ${username}`)
        return username
      }
      return null
    } catch (error) {
      logger.warn('未登录或认证失败')
      return null
    }
  }

  /**
   * 获取 registry URL
   */
  getRegistryUrl(name?: string): string {
    return this.getRegistry(name).url
  }

  /**
   * 获取 registry token
   */
  getRegistryToken(name?: string): string | undefined {
    return this.getRegistry(name).token
  }

  /**
   * 为包选择合适的 registry
   */
  selectRegistryForPackage(packageName: string): RegistryConfig {
    // 检查 scope 映射
    for (const [name, config] of this.registries) {
      if (config.scopes) {
        for (const scope of config.scopes) {
          if (packageName.startsWith(`@${scope}/`)) {
            logger.debug(`为包 ${packageName} 选择 registry: ${name}`)
            return config
          }
        }
      }
    }

    // 使用默认 registry
    return this.getDefaultRegistry()
  }
}

/**
 * 创建 Registry 管理器实例
 */
export function createRegistryManager(options: RegistryManagerOptions = {}): RegistryManager {
  return new RegistryManager(options)
}

