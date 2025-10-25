/**
 * PublishManager 测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createPublishManager } from '../src/core/PublishManager'
import type { PublisherConfig } from '../src/types'

describe('PublishManager', () => {
  it('should create publish manager with default config', () => {
    const manager = createPublishManager()
    expect(manager).toBeDefined()
  })

  it('should create publish manager with custom config', () => {
    const config: PublisherConfig = {
      versionStrategy: 'fixed',
      concurrency: 8,
      logLevel: 'debug',
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })

  it('should initialize with registries', () => {
    const config: PublisherConfig = {
      registries: {
        custom: {
          url: 'https://npm.custom.com',
          access: 'public',
        },
      },
      defaultRegistry: 'custom',
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })

  it('should accept hooks configuration', () => {
    const config: PublisherConfig = {
      hooks: {
        prePublish: async () => {
          console.log('Pre-publish hook')
        },
      },
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })

  it('should accept validation options', () => {
    const config: PublisherConfig = {
      validation: {
        requireCleanWorkingDirectory: true,
        allowedBranches: ['main'],
        scanSensitiveData: true,
        maxPackageSize: 5 * 1024 * 1024,
      },
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })

  it('should accept git options', () => {
    const config: PublisherConfig = {
      git: {
        createTag: true,
        tagPrefix: 'v',
        createCommit: true,
        pushTag: true,
        pushCommit: true,
      },
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })

  it('should accept monorepo options', () => {
    const config: PublisherConfig = {
      monorepo: {
        useWorkspaces: true,
        workspaceProtocol: 'pnpm',
        ignorePrivate: true,
        topologicalSort: true,
      },
    }

    const manager = createPublishManager(config)
    expect(manager).toBeDefined()
  })
})

