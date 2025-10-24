/**
 * 版本管理器
 */

import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import semver from 'semver'
import conventionalRecommendedBump from 'conventional-recommended-bump'
import type {
  VersionBumpType,
  VersionInfo,
  VersionUpdateOptions,
  VersionRecommendation,
  ConventionalCommit,
  PackageJson,
} from '../types/index.js'
import { logger } from '../utils/logger.js'
import { VersionError } from '../utils/error-handler.js'
import { createGitUtils } from '../utils/git-utils.js'

export interface VersionManagerOptions {
  cwd?: string
  packageJsonPath?: string
}

/**
 * 版本管理器
 */
export class VersionManager {
  private cwd: string
  private packageJsonPath: string
  private gitUtils: ReturnType<typeof createGitUtils>

  constructor(options: VersionManagerOptions = {}) {
    this.cwd = options.cwd || process.cwd()
    this.packageJsonPath = options.packageJsonPath || join(this.cwd, 'package.json')
    this.gitUtils = createGitUtils({ cwd: this.cwd })
  }

  /**
   * 读取 package.json
   */
  private async readPackageJson(): Promise<PackageJson> {
    try {
      const content = await readFile(this.packageJsonPath, 'utf-8')
      return JSON.parse(content)
    } catch (error: any) {
      throw new VersionError(
        `读取 package.json 失败: ${error.message}`,
        { path: this.packageJsonPath },
        '请确保 package.json 文件存在且格式正确'
      )
    }
  }

  /**
   * 写入 package.json
   */
  private async writePackageJson(packageJson: PackageJson): Promise<void> {
    try {
      const content = JSON.stringify(packageJson, null, 2) + '\n'
      await writeFile(this.packageJsonPath, content, 'utf-8')
    } catch (error: any) {
      throw new VersionError(
        `写入 package.json 失败: ${error.message}`,
        { path: this.packageJsonPath },
        '请检查文件权限'
      )
    }
  }

  /**
   * 获取当前版本
   */
  async getCurrentVersion(): Promise<string> {
    const packageJson = await this.readPackageJson()
    return packageJson.version || '0.0.0'
  }

  /**
   * 更新版本
   */
  async updateVersion(options: VersionUpdateOptions): Promise<VersionInfo> {
    const currentVersion = await this.getCurrentVersion()
    let newVersion: string

    if (options.version) {
      // 使用指定的版本
      newVersion = options.version
    } else if (options.type) {
      // 根据类型递增版本
      newVersion = this.bumpVersion(currentVersion, options.type, options.preid)
    } else {
      throw new VersionError(
        '必须指定 version 或 type',
        { options },
        '使用 --version 指定版本号或使用 --type 指定递增类型'
      )
    }

    // 验证版本号
    if (!semver.valid(newVersion)) {
      throw new VersionError(
        `无效的版本号: ${newVersion}`,
        { newVersion },
        '请使用符合 semver 规范的版本号'
      )
    }

    // 更新 package.json
    const packageJson = await this.readPackageJson()
    packageJson.version = newVersion
    await this.writePackageJson(packageJson)

    logger.success(`版本已更新: ${currentVersion} -> ${newVersion}`)

    // 获取 Git 信息
    const gitCommit = await this.gitUtils.getCurrentCommit().catch(() => undefined)
    const gitBranch = await this.gitUtils.getCurrentBranch().catch(() => undefined)

    return {
      version: currentVersion,
      newVersion,
      type: options.type,
      preReleaseTag: options.preReleaseTag,
      gitCommit,
      gitBranch,
      buildTime: new Date().toISOString(),
      isPreRelease: semver.prerelease(newVersion) !== null,
    }
  }

  /**
   * 递增版本号
   */
  private bumpVersion(
    version: string,
    type: VersionBumpType,
    preid?: string
  ): string {
    const newVersion = semver.inc(version, type, preid)

    if (!newVersion) {
      throw new VersionError(
        `版本递增失败: ${version} -> ${type}`,
        { version, type, preid },
        '请检查当前版本号和递增类型'
      )
    }

    return newVersion
  }

  /**
   * 比较版本
   */
  compareVersions(v1: string, v2: string): number {
    return semver.compare(v1, v2)
  }

  /**
   * 验证版本号
   */
  isValidVersion(version: string): boolean {
    return semver.valid(version) !== null
  }

  /**
   * 检查版本是否为预发布版本
   */
  isPreRelease(version: string): boolean {
    return semver.prerelease(version) !== null
  }

  /**
   * 获取版本推荐
   */
  async getRecommendedVersion(preset = 'conventionalcommits'): Promise<VersionRecommendation> {
    return new Promise((resolve, reject) => {
      conventionalRecommendedBump(
        {
          preset,
          path: this.cwd,
        },
        async (err: Error | null, recommendation: any) => {
          if (err) {
            reject(new VersionError(
              `获取版本推荐失败: ${err.message}`,
              { preset, error: err.message },
              '请检查 Git 提交记录是否符合 Conventional Commits 规范'
            ))
            return
          }

          const currentVersion = await this.getCurrentVersion()
          const releaseType = recommendation.releaseType as VersionBumpType
          const newVersion = this.bumpVersion(currentVersion, releaseType)

          resolve({
            releaseType,
            version: newVersion,
            reason: recommendation.reason || '基于提交记录分析',
          })
        }
      )
    })
  }

  /**
   * 解析 Conventional Commits
   */
  async parseConventionalCommits(from?: string, to = 'HEAD'): Promise<ConventionalCommit[]> {
    const commits = await this.gitUtils.getCommits(from, to)
    const conventionalCommits: ConventionalCommit[] = []

    const commitRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/
    const breakingRegex = /^BREAKING CHANGE:\s*(.+)$/m

    for (const commit of commits) {
      const match = commit.subject.match(commitRegex)

      if (!match) {
        // 不符合 conventional commits 格式
        continue
      }

      const [, type, scope, subject] = match
      const breaking = breakingRegex.test(commit.body)

      conventionalCommits.push({
        hash: commit.hash,
        type,
        scope,
        subject,
        body: commit.body,
        breaking,
        author: {
          name: commit.authorName,
          email: commit.authorEmail,
        },
        date: commit.date,
      })
    }

    return conventionalCommits
  }

  /**
   * 检查版本是否已发布
   */
  async isVersionPublished(version: string, packageName: string, registry?: string): Promise<boolean> {
    const { createNpmClient } = await import('../utils/npm-client.js')
    const client = createNpmClient({ cwd: this.cwd, registry })

    try {
      return await client.versionExists(packageName, version)
    } catch {
      return false
    }
  }

  /**
   * 获取下一个版本号（基于已发布的版本）
   */
  async getNextVersion(
    packageName: string,
    type: VersionBumpType = 'patch',
    registry?: string
  ): Promise<string> {
    const { createNpmClient } = await import('../utils/npm-client.js')
    const client = createNpmClient({ cwd: this.cwd, registry })

    try {
      const latestVersion = await client.getLatestVersion(packageName)

      if (!latestVersion) {
        // 包未发布，使用当前版本
        return await this.getCurrentVersion()
      }

      // 递增版本
      return this.bumpVersion(latestVersion, type)
    } catch {
      // 获取失败，使用当前版本
      return await this.getCurrentVersion()
    }
  }

  /**
   * 生成版本信息摘要
   */
  async getVersionInfo(): Promise<VersionInfo> {
    const version = await this.getCurrentVersion()
    const gitCommit = await this.gitUtils.getCurrentCommit().catch(() => undefined)
    const gitBranch = await this.gitUtils.getCurrentBranch().catch(() => undefined)
    const gitTag = await this.gitUtils.getLatestTag().catch(() => undefined)

    return {
      version,
      gitCommit,
      gitBranch,
      gitTag,
      buildTime: new Date().toISOString(),
      isPreRelease: semver.prerelease(version) !== null,
    }
  }

  /**
   * 批量更新多个包的版本
   */
  async batchUpdateVersions(
    packages: Array<{ path: string; version: string }>
  ): Promise<void> {
    for (const pkg of packages) {
      const versionManager = new VersionManager({
        cwd: pkg.path,
        packageJsonPath: join(pkg.path, 'package.json'),
      })

      await versionManager.updateVersion({ version: pkg.version })
    }
  }
}

/**
 * 创建版本管理器实例
 */
export function createVersionManager(options: VersionManagerOptions = {}): VersionManager {
  return new VersionManager(options)
}

