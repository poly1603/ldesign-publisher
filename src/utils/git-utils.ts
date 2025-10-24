/**
 * Git 工具函数
 */

import { execa } from 'execa'
import { GitError } from './error-handler.js'
import { logger } from './logger.js'

export interface GitUtilsOptions {
  cwd?: string
}

/**
 * Git 工具类
 */
export class GitUtils {
  private cwd: string

  constructor(options: GitUtilsOptions = {}) {
    this.cwd = options.cwd || process.cwd()
  }

  /**
   * 执行 git 命令
   */
  private async exec(args: string[]): Promise<string> {
    try {
      const result = await execa('git', args, {
        cwd: this.cwd,
        stdout: 'pipe',
        stderr: 'pipe',
      })
      return result.stdout.trim()
    } catch (error: any) {
      throw new GitError(
        `Git 命令执行失败: ${error.message}`,
        { command: `git ${args.join(' ')}`, error: error.message }
      )
    }
  }

  /**
   * 检查是否为 git 仓库
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.exec(['rev-parse', '--git-dir'])
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查工作区是否干净
   */
  async isWorkingDirectoryClean(): Promise<boolean> {
    const status = await this.exec(['status', '--porcelain'])
    return status === ''
  }

  /**
   * 获取当前分支
   */
  async getCurrentBranch(): Promise<string> {
    return await this.exec(['rev-parse', '--abbrev-ref', 'HEAD'])
  }

  /**
   * 获取当前 commit hash
   */
  async getCurrentCommit(short = true): Promise<string> {
    const args = short ? ['rev-parse', '--short', 'HEAD'] : ['rev-parse', 'HEAD']
    return await this.exec(args)
  }

  /**
   * 获取远程 URL
   */
  async getRemoteUrl(remote = 'origin'): Promise<string> {
    return await this.exec(['remote', 'get-url', remote])
  }

  /**
   * 获取最新的 tag
   */
  async getLatestTag(): Promise<string | null> {
    try {
      return await this.exec(['describe', '--tags', '--abbrev=0'])
    } catch {
      return null
    }
  }

  /**
   * 获取所有 tags
   */
  async getAllTags(): Promise<string[]> {
    const output = await this.exec(['tag', '--list'])
    return output ? output.split('\n').filter(Boolean) : []
  }

  /**
   * 创建 tag
   */
  async createTag(tag: string, message?: string, sign = false): Promise<void> {
    const args = ['tag']

    if (sign) {
      args.push('-s')
    } else {
      args.push('-a')
    }

    args.push(tag)

    if (message) {
      args.push('-m', message)
    }

    await this.exec(args)
    logger.success(`创建 tag: ${tag}`)
  }

  /**
   * 删除 tag
   */
  async deleteTag(tag: string): Promise<void> {
    await this.exec(['tag', '-d', tag])
    logger.success(`删除 tag: ${tag}`)
  }

  /**
   * 推送 tag
   */
  async pushTag(tag: string, remote = 'origin'): Promise<void> {
    await this.exec(['push', remote, tag])
    logger.success(`推送 tag: ${tag}`)
  }

  /**
   * 删除远程 tag
   */
  async deleteRemoteTag(tag: string, remote = 'origin'): Promise<void> {
    await this.exec(['push', remote, '--delete', tag])
    logger.success(`删除远程 tag: ${tag}`)
  }

  /**
   * 创建 commit
   */
  async commit(message: string, files?: string[], sign = false): Promise<void> {
    // 添加文件
    if (files && files.length > 0) {
      await this.exec(['add', ...files])
    } else {
      await this.exec(['add', '-A'])
    }

    // 提交
    const args = ['commit', '-m', message]
    if (sign) {
      args.push('-S')
    }

    await this.exec(args)
    logger.success(`创建 commit: ${message}`)
  }

  /**
   * 推送 commits
   */
  async push(remote = 'origin', branch?: string): Promise<void> {
    const args = ['push', remote]
    if (branch) {
      args.push(branch)
    }

    await this.exec(args)
    logger.success(`推送到远程仓库`)
  }

  /**
   * 获取 commits (从某个 tag 到 HEAD)
   */
  async getCommits(from?: string, to = 'HEAD'): Promise<GitCommit[]> {
    const range = from ? `${from}..${to}` : to
    const format = '%H%n%h%n%s%n%b%n%an%n%ae%n%ai'
    const output = await this.exec(['log', range, `--pretty=format:${format}`, '--no-merges'])

    if (!output) {
      return []
    }

    const commits: GitCommit[] = []
    const lines = output.split('\n')

    for (let i = 0; i < lines.length; i += 7) {
      commits.push({
        hash: lines[i],
        shortHash: lines[i + 1],
        subject: lines[i + 2],
        body: lines[i + 3],
        authorName: lines[i + 4],
        authorEmail: lines[i + 5],
        date: lines[i + 6],
      })
    }

    return commits
  }

  /**
   * 检查 tag 是否存在
   */
  async tagExists(tag: string): Promise<boolean> {
    const tags = await this.getAllTags()
    return tags.includes(tag)
  }

  /**
   * 获取两个 commits 之间的文件变化
   */
  async getChangedFiles(from?: string, to = 'HEAD'): Promise<string[]> {
    const range = from ? `${from}..${to}` : to
    const output = await this.exec(['diff', '--name-only', range])
    return output ? output.split('\n').filter(Boolean) : []
  }

  /**
   * 获取 Git 用户信息
   */
  async getUserInfo(): Promise<{ name: string; email: string }> {
    const name = await this.exec(['config', 'user.name'])
    const email = await this.exec(['config', 'user.email'])
    return { name, email }
  }
}

/**
 * Git Commit 信息
 */
export interface GitCommit {
  hash: string
  shortHash: string
  subject: string
  body: string
  authorName: string
  authorEmail: string
  date: string
}

/**
 * 创建 Git 工具实例
 */
export function createGitUtils(options: GitUtilsOptions = {}): GitUtils {
  return new GitUtils(options)
}

