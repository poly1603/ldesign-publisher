/**
 * 依赖解析器 - Monorepo 拓扑排序
 */

import type { PackageInfo, PackageDependencyGraph, WorkspaceInfo } from '../types/index.js'
import { logger } from '../utils/logger.js'
import {
  getWorkspaceInfo,
  buildDependencyGraph,
  topologicalSort,
  detectCircularDependencies,
  filterPackages,
  excludePrivatePackages,
} from '../utils/workspace-utils.js'
import { ValidationError } from '../utils/error-handler.js'

export interface DependencyResolverOptions {
  cwd?: string
  filter?: string | string[]
  ignorePrivate?: boolean
}

/**
 * 依赖解析器
 */
export class DependencyResolver {
  private cwd: string
  private workspaceInfo: WorkspaceInfo | null = null

  constructor(options: DependencyResolverOptions = {}) {
    this.cwd = options.cwd || process.cwd()
  }

  /**
   * 初始化工作空间信息
   */
  async initialize(): Promise<void> {
    this.workspaceInfo = await getWorkspaceInfo(this.cwd)

    if (!this.workspaceInfo) {
      logger.warn('未检测到 Monorepo 工作空间')
    } else {
      logger.info(`发现 ${this.workspaceInfo.allPackages.length} 个包`)
    }
  }

  /**
   * 获取工作空间信息
   */
  getWorkspaceInfo(): WorkspaceInfo | null {
    return this.workspaceInfo
  }

  /**
   * 获取所有包
   */
  getAllPackages(options: DependencyResolverOptions = {}): PackageInfo[] {
    if (!this.workspaceInfo) {
      return []
    }

    let packages = this.workspaceInfo.allPackages

    // 过滤包
    if (options.filter) {
      packages = filterPackages(packages, options.filter)
    }

    // 排除私有包
    if (options.ignorePrivate) {
      packages = excludePrivatePackages(packages)
    }

    return packages
  }

  /**
   * 获取依赖图
   */
  getDependencyGraph(): PackageDependencyGraph | null {
    return this.workspaceInfo?.dependencyGraph || null
  }

  /**
   * 获取拓扑排序后的包列表
   */
  getTopologicalOrder(options: DependencyResolverOptions = {}): string[] {
    const packages = this.getAllPackages(options)

    if (packages.length === 0) {
      return []
    }

    const graph = buildDependencyGraph(packages)

    try {
      return topologicalSort(graph)
    } catch (error: any) {
      throw new ValidationError(
        `拓扑排序失败: ${error.message}`,
        { error: error.message },
        '请检查是否存在循环依赖'
      )
    }
  }

  /**
   * 检测循环依赖
   */
  detectCircularDependencies(options: DependencyResolverOptions = {}): string[][] {
    const packages = this.getAllPackages(options)

    if (packages.length === 0) {
      return []
    }

    const graph = buildDependencyGraph(packages)
    return detectCircularDependencies(graph)
  }

  /**
   * 获取包的依赖
   */
  getPackageDependencies(packageName: string): Set<string> {
    const graph = this.getDependencyGraph()

    if (!graph) {
      return new Set()
    }

    return graph.dependencies.get(packageName) || new Set()
  }

  /**
   * 获取包的被依赖（反向依赖）
   */
  getPackageDependents(packageName: string): Set<string> {
    const graph = this.getDependencyGraph()

    if (!graph) {
      return new Set()
    }

    return graph.dependents.get(packageName) || new Set()
  }

  /**
   * 获取包信息
   */
  getPackageInfo(packageName: string): PackageInfo | null {
    const graph = this.getDependencyGraph()

    if (!graph) {
      return null
    }

    return graph.packages.get(packageName) || null
  }

  /**
   * 检查包是否存在
   */
  hasPackage(packageName: string): boolean {
    return this.getPackageInfo(packageName) !== null
  }

  /**
   * 获取受影响的包（包括自身和所有依赖它的包）
   */
  getAffectedPackages(packageName: string, options: DependencyResolverOptions = {}): PackageInfo[] {
    const affected = new Set<string>()
    const graph = this.getDependencyGraph()

    if (!graph || !graph.packages.has(packageName)) {
      return []
    }

    // 添加自身
    affected.add(packageName)

    // 递归添加所有依赖此包的包
    const visit = (name: string) => {
      const dependents = graph.dependents.get(name)
      if (dependents) {
        for (const dependent of dependents) {
          if (!affected.has(dependent)) {
            affected.add(dependent)
            visit(dependent)
          }
        }
      }
    }

    visit(packageName)

    // 转换为 PackageInfo
    const packages = Array.from(affected)
      .map(name => graph.packages.get(name)!)
      .filter(Boolean)

    // 应用过滤器
    let result = packages

    if (options.filter) {
      result = filterPackages(result, options.filter)
    }

    if (options.ignorePrivate) {
      result = excludePrivatePackages(result)
    }

    return result
  }

  /**
   * 获取需要发布的包（按拓扑顺序）
   */
  getPackagesToPublish(options: DependencyResolverOptions = {}): PackageInfo[] {
    const order = this.getTopologicalOrder(options)
    const graph = this.getDependencyGraph()

    if (!graph) {
      return []
    }

    return order
      .map(name => graph.packages.get(name)!)
      .filter(Boolean)
  }

  /**
   * 验证依赖关系
   */
  async validate(): Promise<ValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []

    if (!this.workspaceInfo) {
      errors.push('未找到工作空间配置')
      return { valid: false, errors, warnings }
    }

    // 检测循环依赖
    const circular = this.detectCircularDependencies()
    if (circular.length > 0) {
      errors.push(`检测到 ${circular.length} 个循环依赖`)
      for (const cycle of circular) {
        errors.push(`  ${cycle.join(' -> ')}`)
      }
    }

    // 检查依赖版本
    const packages = this.getAllPackages()
    for (const pkg of packages) {
      const deps = this.getPackageDependencies(pkg.name)

      for (const depName of deps) {
        const depInfo = this.getPackageInfo(depName)

        if (depInfo) {
          // 检查版本是否匹配
          const specifiedVersion = pkg.packageJson.dependencies?.[depName] ||
            pkg.packageJson.devDependencies?.[depName]

          if (specifiedVersion && !specifiedVersion.startsWith('workspace:')) {
            if (specifiedVersion !== depInfo.version) {
              warnings.push(
                `${pkg.name} 依赖 ${depName}@${specifiedVersion}，但工作空间版本为 ${depInfo.version}`
              )
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 生成依赖关系报告
   */
  generateReport(): DependencyReport {
    const packages = this.getAllPackages()
    const graph = this.getDependencyGraph()
    const circular = this.detectCircularDependencies()

    const report: DependencyReport = {
      totalPackages: packages.length,
      privatePackages: packages.filter(p => p.private).length,
      publicPackages: packages.filter(p => !p.private).length,
      circularDependencies: circular.length,
      dependencies: [],
    }

    if (graph) {
      for (const pkg of packages) {
        const deps = graph.dependencies.get(pkg.name) || new Set()
        const dependents = graph.dependents.get(pkg.name) || new Set()

        report.dependencies.push({
          name: pkg.name,
          version: pkg.version,
          dependencies: Array.from(deps),
          dependents: Array.from(dependents),
          isPrivate: pkg.private || false,
        })
      }
    }

    return report
  }
}

/**
 * 验证结果
 */
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 依赖关系报告
 */
export interface DependencyReport {
  totalPackages: number
  privatePackages: number
  publicPackages: number
  circularDependencies: number
  dependencies: Array<{
    name: string
    version: string
    dependencies: string[]
    dependents: string[]
    isPrivate: boolean
  }>
}

/**
 * 创建依赖解析器实例
 */
export function createDependencyResolver(
  options: DependencyResolverOptions = {}
): DependencyResolver {
  return new DependencyResolver(options)
}

