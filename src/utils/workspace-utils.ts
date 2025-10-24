/**
 * Monorepo 工作空间工具
 */

import { resolve, join, dirname } from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import fg from 'fast-glob'
import type { PackageInfo, PackageJson, WorkspaceInfo, PackageDependencyGraph } from '../types/index.js'
import { logger } from './logger.js'

/**
 * 读取 package.json
 */
async function readPackageJson(packagePath: string): Promise<PackageJson> {
  const content = await readFile(packagePath, 'utf-8')
  return JSON.parse(content)
}

/**
 * 查找工作空间根目录
 */
export async function findWorkspaceRoot(cwd: string = process.cwd()): Promise<string | null> {
  let currentDir = cwd

  while (currentDir !== dirname(currentDir)) {
    const packageJsonPath = join(currentDir, 'package.json')

    if (existsSync(packageJsonPath)) {
      const packageJson = await readPackageJson(packageJsonPath)

      // 检查是否有 workspaces 字段
      if (packageJson.workspaces) {
        return currentDir
      }

      // 检查 pnpm-workspace.yaml
      if (existsSync(join(currentDir, 'pnpm-workspace.yaml'))) {
        return currentDir
      }
    }

    currentDir = dirname(currentDir)
  }

  return null
}

/**
 * 获取工作空间包模式
 */
async function getWorkspacePatterns(rootDir: string): Promise<string[]> {
  const packageJsonPath = join(rootDir, 'package.json')

  if (existsSync(packageJsonPath)) {
    const packageJson = await readPackageJson(packageJsonPath)

    if (Array.isArray(packageJson.workspaces)) {
      return packageJson.workspaces
    }

    if (packageJson.workspaces && Array.isArray(packageJson.workspaces.packages)) {
      return packageJson.workspaces.packages
    }
  }

  // 检查 pnpm-workspace.yaml
  const pnpmWorkspacePath = join(rootDir, 'pnpm-workspace.yaml')
  if (existsSync(pnpmWorkspacePath)) {
    const content = await readFile(pnpmWorkspacePath, 'utf-8')
    const match = content.match(/packages:\s*\n((?:\s+-\s+.+\n?)+)/)

    if (match) {
      return match[1]
        .split('\n')
        .map(line => line.trim().replace(/^-\s+/, ''))
        .filter(Boolean)
    }
  }

  return []
}

/**
 * 查找所有包
 */
export async function findAllPackages(rootDir: string): Promise<PackageInfo[]> {
  const patterns = await getWorkspacePatterns(rootDir)

  if (patterns.length === 0) {
    logger.warn('未找到工作空间配置')
    return []
  }

  const packageJsonPaths = await fg(
    patterns.map(pattern => `${pattern}/package.json`),
    {
      cwd: rootDir,
      absolute: true,
      ignore: ['**/node_modules/**'],
    }
  )

  const packages: PackageInfo[] = []

  for (const packageJsonPath of packageJsonPaths) {
    try {
      const packageJson = await readPackageJson(packageJsonPath)
      const packagePath = dirname(packageJsonPath)

      packages.push({
        name: packageJson.name,
        version: packageJson.version,
        description: packageJson.description,
        path: packagePath,
        packageJsonPath,
        packageJson,
        private: packageJson.private,
        dependencies: packageJson.dependencies,
        devDependencies: packageJson.devDependencies,
        peerDependencies: packageJson.peerDependencies,
        main: packageJson.main,
        module: packageJson.module,
        types: packageJson.types,
        files: packageJson.files,
      })
    } catch (error) {
      logger.warn(`读取包失败: ${packageJsonPath}`, error)
    }
  }

  return packages
}

/**
 * 构建依赖图
 */
export function buildDependencyGraph(packages: PackageInfo[]): PackageDependencyGraph {
  const packageMap = new Map<string, PackageInfo>()
  const dependencies = new Map<string, Set<string>>()
  const dependents = new Map<string, Set<string>>()

  // 构建包映射
  for (const pkg of packages) {
    packageMap.set(pkg.name, pkg)
    dependencies.set(pkg.name, new Set())
    dependents.set(pkg.name, new Set())
  }

  // 构建依赖关系
  for (const pkg of packages) {
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    }

    for (const depName of Object.keys(allDeps)) {
      if (packageMap.has(depName)) {
        dependencies.get(pkg.name)!.add(depName)
        dependents.get(depName)!.add(pkg.name)
      }
    }
  }

  return {
    packages: packageMap,
    dependencies,
    dependents,
  }
}

/**
 * 拓扑排序
 */
export function topologicalSort(graph: PackageDependencyGraph): string[] {
  const { packages, dependencies } = graph
  const sorted: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()

  function visit(name: string): void {
    if (visited.has(name)) return
    if (visiting.has(name)) {
      throw new Error(`检测到循环依赖: ${name}`)
    }

    visiting.add(name)

    const deps = dependencies.get(name)
    if (deps) {
      for (const dep of deps) {
        if (packages.has(dep)) {
          visit(dep)
        }
      }
    }

    visiting.delete(name)
    visited.add(name)
    sorted.push(name)
  }

  for (const name of packages.keys()) {
    visit(name)
  }

  return sorted
}

/**
 * 检测循环依赖
 */
export function detectCircularDependencies(graph: PackageDependencyGraph): string[][] {
  const { packages, dependencies } = graph
  const circular: string[][] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const path: string[] = []

  function visit(name: string): void {
    if (visited.has(name)) return

    if (visiting.has(name)) {
      // 找到循环
      const startIndex = path.indexOf(name)
      circular.push([...path.slice(startIndex), name])
      return
    }

    visiting.add(name)
    path.push(name)

    const deps = dependencies.get(name)
    if (deps) {
      for (const dep of deps) {
        if (packages.has(dep)) {
          visit(dep)
        }
      }
    }

    path.pop()
    visiting.delete(name)
    visited.add(name)
  }

  for (const name of packages.keys()) {
    visit(name)
  }

  return circular
}

/**
 * 获取工作空间信息
 */
export async function getWorkspaceInfo(cwd: string = process.cwd()): Promise<WorkspaceInfo | null> {
  const root = await findWorkspaceRoot(cwd)

  if (!root) {
    return null
  }

  const packages = await getWorkspacePatterns(root)
  const allPackages = await findAllPackages(root)
  const dependencyGraph = buildDependencyGraph(allPackages)
  const packageMap = new Map(allPackages.map(pkg => [pkg.name, pkg]))

  // 检测循环依赖
  const circularDependencies = detectCircularDependencies(dependencyGraph)

  if (circularDependencies.length > 0) {
    logger.warn(`检测到 ${circularDependencies.length} 个循环依赖`)
    for (const cycle of circularDependencies) {
      logger.warn(`  ${cycle.join(' -> ')}`)
    }
  }

  // 拓扑排序
  let topologicalOrder: string[] = []
  try {
    topologicalOrder = topologicalSort(dependencyGraph)
  } catch (error: any) {
    logger.error(`拓扑排序失败: ${error.message}`)
  }

  return {
    root,
    packages,
    allPackages,
    packageMap,
    dependencyGraph: {
      ...dependencyGraph,
      topologicalOrder,
      circularDependencies,
    },
    protocol: existsSync(join(root, 'pnpm-workspace.yaml')) ? 'pnpm' :
      existsSync(join(root, 'yarn.lock')) ? 'yarn' : 'npm',
  }
}

/**
 * 过滤包
 */
export function filterPackages(
  packages: PackageInfo[],
  filter?: string | string[]
): PackageInfo[] {
  if (!filter) {
    return packages
  }

  const filters = Array.isArray(filter) ? filter : [filter]

  return packages.filter(pkg => {
    return filters.some(f => {
      // 精确匹配
      if (f === pkg.name) return true

      // 通配符匹配
      const regex = new RegExp(f.replace(/\*/g, '.*'))
      return regex.test(pkg.name)
    })
  })
}

/**
 * 排除私有包
 */
export function excludePrivatePackages(packages: PackageInfo[]): PackageInfo[] {
  return packages.filter(pkg => !pkg.private)
}

/**
 * 更新工作空间依赖版本
 */
export function updateWorkspaceDependencies(
  packages: PackageInfo[],
  updatedPackages: Map<string, string>
): void {
  for (const pkg of packages) {
    let updated = false

    // 更新 dependencies
    if (pkg.packageJson.dependencies) {
      for (const [name, newVersion] of updatedPackages) {
        if (pkg.packageJson.dependencies[name]) {
          pkg.packageJson.dependencies[name] = newVersion
          updated = true
        }
      }
    }

    // 更新 devDependencies
    if (pkg.packageJson.devDependencies) {
      for (const [name, newVersion] of updatedPackages) {
        if (pkg.packageJson.devDependencies[name]) {
          pkg.packageJson.devDependencies[name] = newVersion
          updated = true
        }
      }
    }

    // 更新 peerDependencies
    if (pkg.packageJson.peerDependencies) {
      for (const [name, newVersion] of updatedPackages) {
        if (pkg.packageJson.peerDependencies[name]) {
          pkg.packageJson.peerDependencies[name] = newVersion
          updated = true
        }
      }
    }

    if (updated) {
      logger.debug(`更新包 ${pkg.name} 的工作空间依赖`)
    }
  }
}

