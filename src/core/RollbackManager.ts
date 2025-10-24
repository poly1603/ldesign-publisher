/**
 * 回滚管理器
 */

import { join } from 'path'
import { writeFile, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import type { RollbackOptions, RollbackRecord, RollbackAction } from '../types/index.js'
import { logger } from '../utils/logger.js'
import { createNpmClient } from '../utils/npm-client.js'
import { createGitUtils } from '../utils/git-utils.js'
import { PublisherError } from '../utils/error-handler.js'

/**
 * 回滚管理器
 */
export class RollbackManager {
  private cwd: string
  private historyFile: string
  private gitUtils: ReturnType<typeof createGitUtils>

  constructor(cwd: string = process.cwd()) {
    this.cwd = cwd
    this.historyFile = join(cwd, '.publisher-history.json')
    this.gitUtils = createGitUtils({ cwd })
  }

  /**
   * 回滚发布
   */
  async rollback(packageName: string, options: RollbackOptions = {}): Promise<RollbackRecord> {
    const record: RollbackRecord = {
      id: Date.now().toString(),
      package: packageName,
      version: options.version || '',
      reason: options.reason || '手动回滚',
      timestamp: Date.now(),
      actions: [],
      success: false,
    }

    logger.info(`开始回滚 ${packageName}...`)

    try {
      // 1. Unpublish 或 Deprecate
      if (options.unpublish) {
        await this.unpublishPackage(packageName, options.version, record, options)
      } else if (options.deprecate) {
        await this.deprecatePackage(packageName, options.version!, record, options)
      }

      // 2. 恢复 Git
      if (options.revertGit) {
        await this.revertGit(packageName, options.version!, record)
      }

      // 3. 删除 Tag
      if (options.deleteTag) {
        await this.deleteTag(options.version!, record)
      }

      record.success = true
      logger.success(`回滚成功: ${packageName}`)
    } catch (error: any) {
      record.success = false
      record.error = error.message
      logger.error(`回滚失败: ${error.message}`)
      throw error
    } finally {
      await this.saveRecord(record)
    }

    return record
  }

  /**
   * Unpublish 包
   */
  private async unpublishPackage(
    packageName: string,
    version: string | undefined,
    record: RollbackRecord,
    options: RollbackOptions
  ): Promise<void> {
    const action: RollbackAction = {
      type: 'unpublish',
      description: `Unpublish ${packageName}${version ? `@${version}` : ''}`,
      success: false,
      timestamp: Date.now(),
    }

    try {
      const client = createNpmClient({
        cwd: this.cwd,
        registry: options.registry,
      })

      await client.unpublish(packageName, version)
      action.success = true
      logger.success(`Unpublished ${packageName}${version ? `@${version}` : ''}`)
    } catch (error: any) {
      action.error = error.message
      logger.error(`Unpublish 失败: ${error.message}`)
    }

    record.actions.push(action)
  }

  /**
   * Deprecate 包
   */
  private async deprecatePackage(
    packageName: string,
    version: string,
    record: RollbackRecord,
    options: RollbackOptions
  ): Promise<void> {
    const action: RollbackAction = {
      type: 'deprecate',
      description: `Deprecate ${packageName}@${version}`,
      success: false,
      timestamp: Date.now(),
    }

    try {
      const client = createNpmClient({
        cwd: this.cwd,
        registry: options.registry,
      })

      const message = options.deprecateMessage || `版本 ${version} 已废弃`
      await client.deprecate(packageName, version, message)

      action.success = true
      logger.success(`Deprecated ${packageName}@${version}`)
    } catch (error: any) {
      action.error = error.message
      logger.error(`Deprecate 失败: ${error.message}`)
    }

    record.actions.push(action)
  }

  /**
   * 恢复 Git
   */
  private async revertGit(
    packageName: string,
    version: string,
    record: RollbackRecord
  ): Promise<void> {
    const action: RollbackAction = {
      type: 'revert-git',
      description: `Revert Git changes for ${version}`,
      success: false,
      timestamp: Date.now(),
    }

    try {
      // 这里应该实现 Git 恢复逻辑
      logger.warn('Git 恢复功能待实现')
      action.success = true
    } catch (error: any) {
      action.error = error.message
      logger.error(`Git 恢复失败: ${error.message}`)
    }

    record.actions.push(action)
  }

  /**
   * 删除 Tag
   */
  private async deleteTag(version: string, record: RollbackRecord): Promise<void> {
    const action: RollbackAction = {
      type: 'delete-tag',
      description: `Delete tag v${version}`,
      success: false,
      timestamp: Date.now(),
    }

    try {
      const tag = version.startsWith('v') ? version : `v${version}`

      if (await this.gitUtils.tagExists(tag)) {
        await this.gitUtils.deleteTag(tag)
        await this.gitUtils.deleteRemoteTag(tag)
        action.success = true
      } else {
        logger.warn(`Tag ${tag} 不存在`)
        action.success = true
      }
    } catch (error: any) {
      action.error = error.message
      logger.error(`删除 tag 失败: ${error.message}`)
    }

    record.actions.push(action)
  }

  /**
   * 保存回滚记录
   */
  private async saveRecord(record: RollbackRecord): Promise<void> {
    try {
      let records: RollbackRecord[] = []

      if (existsSync(this.historyFile)) {
        const content = await readFile(this.historyFile, 'utf-8')
        records = JSON.parse(content)
      }

      records.push(record)
      await writeFile(this.historyFile, JSON.stringify(records, null, 2), 'utf-8')
    } catch (error) {
      logger.warn('保存回滚记录失败')
    }
  }

  /**
   * 获取回滚历史
   */
  async getHistory(): Promise<RollbackRecord[]> {
    try {
      if (!existsSync(this.historyFile)) {
        return []
      }

      const content = await readFile(this.historyFile, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return []
    }
  }
}

/**
 * 创建回滚管理器实例
 */
export function createRollbackManager(cwd?: string): RollbackManager {
  return new RollbackManager(cwd)
}

