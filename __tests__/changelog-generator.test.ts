/**
 * ChangelogGenerator 测试
 */

import { describe, it, expect } from 'vitest'
import { createChangelogGenerator } from '../src/core/ChangelogGenerator'

describe('ChangelogGenerator', () => {
  it('should create changelog generator', () => {
    const generator = createChangelogGenerator()
    expect(generator).toBeDefined()
  })

  it('should create with custom options', () => {
    const generator = createChangelogGenerator({
      options: {
        enabled: true,
        conventional: true,
        output: 'HISTORY.md',
        includeAuthors: true,
        includePRLinks: true,
      },
    })
    expect(generator).toBeDefined()
  })

  it('should create with package name', () => {
    const generator = createChangelogGenerator({
      packageName: '@test/package',
    })
    expect(generator).toBeDefined()
  })

  it('should create with custom cwd', () => {
    const generator = createChangelogGenerator({
      cwd: '/custom/path',
    })
    expect(generator).toBeDefined()
  })
})

