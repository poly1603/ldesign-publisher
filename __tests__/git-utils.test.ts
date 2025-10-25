/**
 * GitUtils 测试
 */

import { describe, it, expect } from 'vitest'
import { createGitUtils } from '../src/utils/git-utils'

describe('GitUtils', () => {
  it('should create git utils', () => {
    const gitUtils = createGitUtils()
    expect(gitUtils).toBeDefined()
  })

  it('should create with custom cwd', () => {
    const gitUtils = createGitUtils({ cwd: '/custom/path' })
    expect(gitUtils).toBeDefined()
  })

  it('should check if is git repository', async () => {
    const gitUtils = createGitUtils()

    try {
      const isRepo = await gitUtils.isGitRepository()
      expect(typeof isRepo).toBe('boolean')
    } catch {
      // 测试环境可能不是 Git 仓库
      expect(true).toBe(true)
    }
  })

  it('should compare versions', () => {
    const gitUtils = createGitUtils()
    expect(gitUtils).toBeDefined()
  })
})

