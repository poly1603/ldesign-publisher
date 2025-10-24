/**
 * VersionManager 测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createVersionManager } from '../src/core/VersionManager'
import { join } from 'path'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'

describe('VersionManager', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'publisher-test-'))
    const packageJson = {
      name: 'test-package',
      version: '1.0.0',
    }
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  it('should get current version', async () => {
    const versionManager = createVersionManager({ cwd: testDir })
    const version = await versionManager.getCurrentVersion()
    expect(version).toBe('1.0.0')
  })

  it('should update version', async () => {
    const versionManager = createVersionManager({ cwd: testDir })
    const result = await versionManager.updateVersion({ type: 'patch' })
    expect(result.newVersion).toBe('1.0.1')
  })

  it('should validate version', () => {
    const versionManager = createVersionManager({ cwd: testDir })
    expect(versionManager.isValidVersion('1.0.0')).toBe(true)
    expect(versionManager.isValidVersion('invalid')).toBe(false)
  })

  it('should compare versions', () => {
    const versionManager = createVersionManager({ cwd: testDir })
    expect(versionManager.compareVersions('1.0.0', '1.0.1')).toBe(-1)
    expect(versionManager.compareVersions('1.0.1', '1.0.0')).toBe(1)
    expect(versionManager.compareVersions('1.0.0', '1.0.0')).toBe(0)
  })
})

