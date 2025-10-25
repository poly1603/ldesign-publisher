/**
 * ConfigValidator 测试
 */

import { describe, it, expect } from 'vitest'
import { createConfigValidator } from '../src/validators/config-validator'
import type { PublisherConfig } from '../src/types'

describe('ConfigValidator', () => {
  const validator = createConfigValidator()

  it('should validate valid config', () => {
    const config: PublisherConfig = {
      versionStrategy: 'independent',
      registries: {
        npm: {
          url: 'https://registry.npmjs.org',
          access: 'public',
        },
      },
      defaultRegistry: 'npm',
    }

    const result = validator.validate(config)
    expect(result.valid).toBe(true)
  })

  it('should reject invalid registry URL', () => {
    const config = {
      registries: {
        npm: {
          url: 'invalid-url',
        },
      },
    }

    const result = validator.validate(config)
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should reject invalid version strategy', () => {
    const config = {
      versionStrategy: 'invalid',
    }

    const result = validator.validate(config)
    expect(result.valid).toBe(false)
  })

  it('should warn about high concurrency', () => {
    const config: PublisherConfig = {
      concurrency: 20,
    }

    const result = validator.validate(config)
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.length).toBeGreaterThan(0)
  })

  it('should validate git options consistency', () => {
    const config: PublisherConfig = {
      git: {
        pushTag: true,
        createTag: false,
      },
    }

    const result = validator.validate(config)
    expect(result.warnings).toBeDefined()
  })

  it('should generate default config', () => {
    const defaultConfig = validator.generateDefaultConfig()
    expect(defaultConfig.versionStrategy).toBe('independent')
    expect(defaultConfig.concurrency).toBe(4)
    expect(defaultConfig.registries).toBeDefined()
  })

  it('should validate and throw on invalid config', () => {
    const config = {
      versionStrategy: 'invalid',
    }

    expect(() => {
      validator.validateOrThrow(config)
    }).toThrow()
  })

  it('should validate empty config', () => {
    const config = {}
    const result = validator.validate(config)
    expect(result.valid).toBe(true)
  })

  it('should detect conflicting publish config', () => {
    const config: PublisherConfig = {
      publish: {
        parallel: true,
      },
      monorepo: {
        publishOrder: 'serial',
      },
    }

    const result = validator.validate(config)
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.code === 'CONFLICTING_PUBLISH_CONFIG')).toBe(true)
  })

  it('should validate changelog options', () => {
    const config: PublisherConfig = {
      changelog: {
        enabled: true,
        conventional: true,
        output: 'CHANGELOG.md',
        language: 'zh-CN',
      },
    }

    const result = validator.validate(config)
    expect(result.valid).toBe(true)
  })
})

