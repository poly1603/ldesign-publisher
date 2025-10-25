/**
 * Changelog 生成器
 */

import { join } from 'path'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import conventionalChangelog from 'conventional-changelog-core'
import { Readable } from 'stream'
import type {
  ChangelogOptions,
  ChangelogContent,
  ChangelogSection,
  ChangelogCommit,
  CommitTypeConfig,
} from '../types/index.js'
import { logger } from '../utils/logger.js'
import { createGitUtils } from '../utils/git-utils.js'

export interface ChangelogGeneratorOptions {
  cwd?: string
  packageName?: string
  options?: ChangelogOptions
}

/**
 * Changelog 生成器
 */
export class ChangelogGenerator {
  private cwd: string
  private packageName: string
  private options: Required<ChangelogOptions>
  private gitUtils: ReturnType<typeof createGitUtils>
  private repositoryUrl: string | null = null
  private repositoryType: 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'other' = 'other'

  // 默认的 commit 类型配置
  private static DEFAULT_TYPES: CommitTypeConfig[] = [
    { type: 'feat', section: '✨ 新功能', priority: 1 },
    { type: 'fix', section: '🐛 Bug 修复', priority: 2 },
    { type: 'perf', section: '⚡ 性能优化', priority: 3 },
    { type: 'refactor', section: '♻️ 代码重构', priority: 4 },
    { type: 'docs', section: '📝 文档更新', priority: 5 },
    { type: 'style', section: '💄 代码样式', priority: 6 },
    { type: 'test', section: '✅ 测试', priority: 7 },
    { type: 'build', section: '📦 构建系统', priority: 8 },
    { type: 'ci', section: '👷 CI/CD', priority: 9 },
    { type: 'chore', section: '🔧 其他', priority: 10 },
  ]

  constructor(options: ChangelogGeneratorOptions = {}) {
    this.cwd = options.cwd || process.cwd()
    this.packageName = options.packageName || ''
    this.gitUtils = createGitUtils({ cwd: this.cwd })

    // 合并默认选项
    this.options = {
      enabled: true,
      conventional: true,
      output: 'CHANGELOG.md',
      includeAllCommits: false,
      types: ChangelogGenerator.DEFAULT_TYPES,
      groupByType: true,
      includeAuthors: true,
      includePRLinks: true,
      includeCommitHash: true,
      headerFormat: '## [{version}]({compareUrl}) ({date})',
      dateFormat: 'YYYY-MM-DD',
      language: 'zh-CN',
      regenerate: false,
      ...options.options,
    }

    // 初始化仓库信息
    this.initializeRepository().catch(() => {
      logger.debug('无法获取仓库信息，PR 和 commit 链接将不可用')
    })
  }

  /**
   * 初始化仓库信息
   * 
   * 从 Git remote 获取仓库 URL 并判断仓库类型
   * 
   * @private
   */
  private async initializeRepository(): Promise<void> {
    try {
      const remoteUrl = await this.gitUtils.getRemoteUrl()
      this.repositoryUrl = this.parseRepositoryUrl(remoteUrl)
      this.repositoryType = this.detectRepositoryType(this.repositoryUrl)

      logger.debug(`仓库类型: ${this.repositoryType}, URL: ${this.repositoryUrl}`)
    } catch (error) {
      // 静默失败，链接功能将不可用
      this.repositoryUrl = null
    }
  }

  /**
   * 解析仓库 URL
   * 
   * 将 Git URL 转换为 HTTPS URL
   * 
   * @param remoteUrl - Git remote URL
   * @returns HTTPS URL
   * @private
   */
  private parseRepositoryUrl(remoteUrl: string): string {
    // 移除 .git 后缀
    let url = remoteUrl.replace(/\.git$/, '')

    // 转换 SSH URL 为 HTTPS
    // git@github.com:user/repo -> https://github.com/user/repo
    url = url.replace(/^git@([^:]+):(.+)$/, 'https://$1/$2')

    // 移除 git:// 协议
    url = url.replace(/^git:\/\//, 'https://')

    return url
  }

  /**
   * 检测仓库类型
   * 
   * @param url - 仓库 URL
   * @returns 仓库类型
   * @private
   */
  private detectRepositoryType(url: string): 'github' | 'gitlab' | 'gitee' | 'bitbucket' | 'other' {
    if (url.includes('github.com')) {
      return 'github'
    } else if (url.includes('gitlab.com') || url.includes('gitlab.')) {
      return 'gitlab'
    } else if (url.includes('gitee.com')) {
      return 'gitee'
    } else if (url.includes('bitbucket.org')) {
      return 'bitbucket'
    }
    return 'other'
  }

  /**
   * 生成 Changelog
   */
  async generate(version: string, from?: string, to = 'HEAD'): Promise<ChangelogContent> {
    logger.info('生成 Changelog...')

    const commits = await this.gitUtils.getCommits(from, to)
    const parsedCommits = this.parseCommits(commits)
    const sections = this.groupCommits(parsedCommits)
    const date = new Date().toISOString().split('T')[0]

    const content: ChangelogContent = {
      version,
      date,
      sections,
      commits: parsedCommits,
    }

    // 生成原始内容
    content.raw = this.formatChangelog(content)

    logger.success(`生成了 ${parsedCommits.length} 个提交的 Changelog`)

    return content
  }

  /**
   * 解析提交
   */
  private parseCommits(commits: any[]): ChangelogCommit[] {
    const parsed: ChangelogCommit[] = []
    const commitRegex = /^(\w+)(?:\(([^)]+)\))?: (.+)$/

    for (const commit of commits) {
      const match = commit.subject.match(commitRegex)

      if (!match && !this.options.includeAllCommits) {
        continue
      }

      let type = 'other'
      let scope: string | undefined
      let subject = commit.subject

      if (match) {
        type = match[1]
        scope = match[2]
        subject = match[3]
      }

      // 检查是否应该隐藏此类型
      const typeConfig = this.options.types?.find(t => t.type === type)
      if (typeConfig?.hidden) {
        continue
      }

      // 提取 PR 编号
      const prMatch = subject.match(/#(\d+)/)
      const pr = prMatch ? prMatch[1] : undefined

      // 检查 breaking change
      const breaking = commit.body?.includes('BREAKING CHANGE')

      parsed.push({
        hash: commit.hash,
        shortHash: commit.shortHash,
        type,
        scope,
        subject,
        body: commit.body,
        author: {
          name: commit.authorName,
          email: commit.authorEmail,
        },
        pr,
        breaking,
        date: commit.date,
      })
    }

    return parsed
  }

  /**
   * 分组提交
   */
  private groupCommits(commits: ChangelogCommit[]): ChangelogSection[] {
    if (!this.options.groupByType) {
      return [{
        title: '更新',
        type: 'all',
        commits,
      }]
    }

    const groups = new Map<string, ChangelogCommit[]>()

    for (const commit of commits) {
      const typeConfig = this.options.types?.find(t => t.type === commit.type)
      const section = typeConfig?.section || commit.type

      if (!groups.has(section)) {
        groups.set(section, [])
      }
      groups.get(section)!.push(commit)
    }

    // 转换为数组并排序
    const sections: ChangelogSection[] = []

    for (const [title, commits] of groups) {
      const typeConfig = this.options.types?.find(t => t.section === title)
      sections.push({
        title,
        type: typeConfig?.type || 'other',
        commits,
      })
    }

    // 按优先级排序
    sections.sort((a, b) => {
      const aPriority = this.options.types?.find(t => t.type === a.type)?.priority || 999
      const bPriority = this.options.types?.find(t => t.type === b.type)?.priority || 999
      return aPriority - bPriority
    })

    return sections
  }

  /**
   * 格式化 Changelog
   */
  private formatChangelog(content: ChangelogContent): string {
    const lines: string[] = []

    // 标题
    lines.push(`## [${content.version}] - ${content.date}`)
    lines.push('')

    // 按类型分组
    for (const section of content.sections) {
      if (section.commits.length === 0) continue

      lines.push(`### ${section.title}`)
      lines.push('')

      for (const commit of section.commits) {
        let line = '- '

        // Scope
        if (commit.scope) {
          line += `**${commit.scope}**: `
        }

        // 主题
        line += commit.subject

        // PR 链接
        if (this.options.includePRLinks && commit.pr) {
          line += ` ([#${commit.pr}](${this.getPRLink(commit.pr)}))`
        }

        // Commit hash
        if (this.options.includeCommitHash) {
          line += ` ([${commit.shortHash}](${this.getCommitLink(commit.hash)}))`
        }

        // 作者
        if (this.options.includeAuthors && commit.author) {
          line += ` - @${commit.author.name}`
        }

        lines.push(line)
      }

      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 获取 PR 链接
   * 
   * 根据仓库类型生成正确的 PR 链接
   * 
   * @param pr - PR 编号
   * @returns PR 链接 URL
   * @private
   */
  private getPRLink(pr: string): string {
    if (!this.repositoryUrl) {
      return `#${pr}`
    }

    switch (this.repositoryType) {
      case 'github':
      case 'gitee':
        return `${this.repositoryUrl}/pull/${pr}`
      case 'gitlab':
        return `${this.repositoryUrl}/merge_requests/${pr}`
      case 'bitbucket':
        return `${this.repositoryUrl}/pull-requests/${pr}`
      default:
        return `#${pr}`
    }
  }

  /**
   * 获取 Commit 链接
   * 
   * 根据仓库类型生成正确的 commit 链接
   * 
   * @param hash - Commit hash
   * @returns Commit 链接 URL
   * @private
   */
  private getCommitLink(hash: string): string {
    if (!this.repositoryUrl) {
      return hash
    }

    switch (this.repositoryType) {
      case 'github':
      case 'gitlab':
      case 'gitee':
      case 'bitbucket':
        return `${this.repositoryUrl}/commit/${hash}`
      default:
        return hash
    }
  }

  /**
   * 写入 Changelog 文件
   */
  async write(content: ChangelogContent): Promise<void> {
    const outputPath = join(this.cwd, this.options.output!)

    let existingContent = ''

    if (existsSync(outputPath) && !this.options.regenerate) {
      existingContent = await readFile(outputPath, 'utf-8')
    }

    let newContent = content.raw!

    if (existingContent && !this.options.regenerate) {
      // 插入到现有内容之前
      const headerMatch = existingContent.match(/^#\s+.+\n/)
      if (headerMatch) {
        newContent = headerMatch[0] + '\n' + newContent + '\n' + existingContent.substring(headerMatch[0].length)
      } else {
        newContent = newContent + '\n\n' + existingContent
      }
    } else {
      // 添加标题
      newContent = `# Changelog\n\n${newContent}`
    }

    await writeFile(outputPath, newContent, 'utf-8')
    logger.success(`Changelog 已写入: ${outputPath}`)
  }

  /**
   * 使用 conventional-changelog 生成
   */
  async generateWithConventional(version: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = []

      const stream = conventionalChangelog({
        preset: 'conventionalcommits',
        pkg: {
          path: join(this.cwd, 'package.json'),
        },
      }, {
        version,
        currentTag: `v${version}`,
      })

      stream.on('data', (chunk: Buffer) => {
        chunks.push(chunk)
      })

      stream.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'))
      })

      stream.on('error', (error: Error) => {
        reject(error)
      })
    })
  }

  /**
   * 生成并写入 Changelog
   */
  async generateAndWrite(version: string, from?: string, to = 'HEAD'): Promise<void> {
    if (!this.options.enabled) {
      logger.info('Changelog 生成已禁用')
      return
    }

    const content = await this.generate(version, from, to)
    await this.write(content)
  }
}

/**
 * 创建 Changelog 生成器实例
 */
export function createChangelogGenerator(
  options: ChangelogGeneratorOptions = {}
): ChangelogGenerator {
  return new ChangelogGenerator(options)
}

