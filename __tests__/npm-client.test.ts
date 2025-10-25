/**
 * NpmClient 测试
 */

import { describe, it, expect } from 'vitest'
import { createNpmClient } from '../src/utils/npm-client'

describe('NpmClient', () => {
  it('should create npm client', () => {
    const client = createNpmClient()
    expect(client).toBeDefined()
  })

  it('should create with custom options', () => {
    const client = createNpmClient({
      cwd: '/custom/path',
      registry: 'https://registry.npmjs.org',
      tag: 'latest',
    })
    expect(client).toBeDefined()
  })

  it('should create with token', () => {
    const client = createNpmClient({
      token: 'test-token',
    })
    expect(client).toBeDefined()
  })

  it('should create with dry-run mode', () => {
    const client = createNpmClient({
      dryRun: true,
    })
    expect(client).toBeDefined()
  })
})

