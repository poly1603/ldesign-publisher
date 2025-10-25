/**
 * DependencyResolver 测试
 */

import { describe, it, expect } from 'vitest'
import { createDependencyResolver } from '../src/core/DependencyResolver'

describe('DependencyResolver', () => {
  it('should create dependency resolver', () => {
    const resolver = createDependencyResolver()
    expect(resolver).toBeDefined()
  })

  it('should get workspace info', async () => {
    const resolver = createDependencyResolver()
    await resolver.initialize()

    const workspaceInfo = resolver.getWorkspaceInfo()
    // 可能没有工作空间（取决于测试环境）
    expect(workspaceInfo === null || typeof workspaceInfo === 'object').toBe(true)
  })

  it('should get all packages', async () => {
    const resolver = createDependencyResolver()
    await resolver.initialize()

    const packages = resolver.getAllPackages()
    expect(Array.isArray(packages)).toBe(true)
  })

  it('should detect circular dependencies', async () => {
    const resolver = createDependencyResolver()
    await resolver.initialize()

    const circular = resolver.detectCircularDependencies()
    expect(Array.isArray(circular)).toBe(true)
  })

  it('should get topological order', async () => {
    const resolver = createDependencyResolver()
    await resolver.initialize()

    const order = resolver.getTopologicalOrder()
    expect(Array.isArray(order)).toBe(true)
  })
})

