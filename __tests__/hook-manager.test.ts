/**
 * HookManager 测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createHookManager } from '../src/core/HookManager'

describe('HookManager', () => {
  let hookManager: ReturnType<typeof createHookManager>

  beforeEach(() => {
    hookManager = createHookManager()
  })

  it('should create hook manager', () => {
    expect(hookManager).toBeDefined()
  })

  it('should execute function hook', async () => {
    let executed = false
    const hooks = {
      prePublish: async () => {
        executed = true
      },
    }

    const manager = createHookManager(hooks)
    await manager.executeHook('prePublish')

    expect(executed).toBe(true)
  })

  it('should execute command hook', async () => {
    const hooks = {
      prePublish: 'echo "test"',
    }

    const manager = createHookManager(hooks)
    const results = await manager.executeHook('prePublish')

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(true)
  })

  it('should execute multiple hooks', async () => {
    const hooks = {
      prePublish: ['echo "test1"', 'echo "test2"'],
    }

    const manager = createHookManager(hooks)
    const results = await manager.executeHook('prePublish')

    expect(results).toHaveLength(2)
    expect(results.every(r => r.success)).toBe(true)
  })

  it('should check if hook exists', () => {
    const hooks = {
      prePublish: async () => { },
    }

    const manager = createHookManager(hooks)
    expect(manager.hasHook('prePublish')).toBe(true)
    expect(manager.hasHook('postPublish')).toBe(false)
  })

  it('should get execution history', async () => {
    let count = 0
    const hooks = {
      prePublish: async () => {
        count++
      },
    }

    const manager = createHookManager(hooks)
    await manager.executeHook('prePublish')
    await manager.executeHook('prePublish')

    const history = manager.getExecutionHistory('prePublish')
    expect(history).toHaveLength(2)
    expect(count).toBe(2)
  })

  it('should clear execution history', async () => {
    const hooks = {
      prePublish: async () => { },
    }

    const manager = createHookManager(hooks)
    await manager.executeHook('prePublish')

    manager.clearHistory()
    const history = manager.getExecutionHistory('prePublish')
    expect(history).toHaveLength(0)
  })

  it('should generate execution report', async () => {
    const hooks = {
      prePublish: async () => { },
      postPublish: async () => { },
    }

    const manager = createHookManager(hooks)
    await manager.executeHook('prePublish')
    await manager.executeHook('postPublish')

    const report = manager.generateReport()
    expect(report).toContain('prePublish')
    expect(report).toContain('postPublish')
  })

  it('should handle hook errors gracefully', async () => {
    const hooks = {
      prePublish: async () => {
        throw new Error('Hook error')
      },
    }

    const manager = createHookManager(hooks)
    const results = await manager.executeHook('prePublish')

    expect(results).toHaveLength(1)
    expect(results[0].success).toBe(false)
    expect(results[0].error).toContain('Hook error')
  })
})

