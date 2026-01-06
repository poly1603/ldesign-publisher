/**
 * Cache 测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { MemoryCache, getGlobalCache, resetGlobalCache } from '../src/utils/cache'

describe('MemoryCache', () => {
  let cache: MemoryCache

  beforeEach(() => {
    cache = new MemoryCache({ ttl: 1000, maxSize: 10 })
  })

  afterEach(() => {
    cache.destroy()
  })

  it('should set and get cache', () => {
    cache.set('key', 'value')
    expect(cache.get('key')).toBe('value')
  })

  it('should return undefined for non-existent key', () => {
    expect(cache.get('nonexistent')).toBeUndefined()
  })

  it('should expire cache after TTL', async () => {
    cache.set('key', 'value', 100)
    expect(cache.get('key')).toBe('value')

    await new Promise(resolve => setTimeout(resolve, 150))
    expect(cache.get('key')).toBeUndefined()
  })

  it('should check if key exists', () => {
    cache.set('key', 'value')
    expect(cache.has('key')).toBe(true)
    expect(cache.has('nonexistent')).toBe(false)
  })

  it('should delete cache', () => {
    cache.set('key', 'value')
    expect(cache.delete('key')).toBe(true)
    expect(cache.has('key')).toBe(false)
  })

  it('should clear all cache', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('should get cache size', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    expect(cache.size).toBe(2)
  })

  it('should get cache keys', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    const keys = cache.keys()
    expect(keys).toContain('key1')
    expect(keys).toContain('key2')
  })

  it('should track hit and miss', () => {
    cache.set('key', 'value')
    cache.get('key') // hit
    cache.get('nonexistent') // miss

    const stats = cache.getStats()
    expect(stats.hits).toBe(1)
    expect(stats.misses).toBe(1)
    expect(stats.hitRate).toBe(0.5)
  })

  it('should cleanup expired cache', async () => {
    cache.set('key1', 'value1', 100)
    cache.set('key2', 'value2', 1000)

    await new Promise(resolve => setTimeout(resolve, 150))
    const cleaned = cache.cleanup()

    expect(cleaned).toBe(1)
    expect(cache.has('key1')).toBe(false)
    expect(cache.has('key2')).toBe(true)
  })

  it('should evict LRU when cache is full', async () => {
    const smallCache = new MemoryCache({ maxSize: 3 })

    smallCache.set('key1', 'value1')
    await new Promise(resolve => setTimeout(resolve, 10))
    smallCache.set('key2', 'value2')
    await new Promise(resolve => setTimeout(resolve, 10))
    smallCache.set('key3', 'value3')

    // Access key1 to make it recently used
    await new Promise(resolve => setTimeout(resolve, 10))
    smallCache.get('key1')

    // Adding key4 should evict key2 (least recently used after key1 was accessed)
    smallCache.set('key4', 'value4')

    expect(smallCache.size).toBe(3)
    expect(smallCache.has('key2')).toBe(false)
    expect(smallCache.has('key1')).toBe(true)  // key1 was accessed, should be kept
    expect(smallCache.has('key3')).toBe(true)
    expect(smallCache.has('key4')).toBe(true)

    smallCache.destroy()
  })
})

describe('Global Cache', () => {
  afterEach(() => {
    resetGlobalCache()
  })

  it('should get global cache instance', () => {
    const cache1 = getGlobalCache()
    const cache2 = getGlobalCache()
    expect(cache1).toBe(cache2)
  })

  it('should reset global cache', () => {
    const cache1 = getGlobalCache()
    cache1.set('key', 'value')

    resetGlobalCache()

    const cache2 = getGlobalCache()
    expect(cache2.has('key')).toBe(false)
  })
})

