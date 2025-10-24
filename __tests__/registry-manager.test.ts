/**
 * RegistryManager 测试
 */

import { describe, it, expect } from 'vitest'
import { createRegistryManager } from '../src/core/RegistryManager'

describe('RegistryManager', () => {
  it('should create registry manager with default registry', () => {
    const manager = createRegistryManager()
    const registry = manager.getDefaultRegistry()
    expect(registry.url).toBe('https://registry.npmjs.org')
  })

  it('should add custom registry', () => {
    const manager = createRegistryManager()
    manager.addRegistry('custom', {
      url: 'https://npm.custom.com',
      access: 'public',
    })
    const registry = manager.getRegistry('custom')
    expect(registry.url).toBe('https://npm.custom.com')
  })

  it('should list all registries', () => {
    const manager = createRegistryManager()
    manager.addRegistry('custom', {
      url: 'https://npm.custom.com',
      access: 'public',
    })
    const registries = manager.listRegistries()
    expect(registries.length).toBeGreaterThanOrEqual(2)
  })

  it('should select registry for scoped package', () => {
    const manager = createRegistryManager()
    manager.addRegistry('custom', {
      url: 'https://npm.custom.com',
      access: 'public',
      scopes: ['mycompany'],
    })
    const registry = manager.selectRegistryForPackage('@mycompany/test')
    expect(registry.url).toBe('https://npm.custom.com')
  })
})

