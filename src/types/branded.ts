/**
 * Branded Types 和类型守卫
 * 
 * 提供更强类型安全性的工具类型和类型守卫函数
 * 
 * @packageDocumentation
 */

// ============================================================================
// Branded Types（品牌类型）
// ============================================================================

/**
 * 品牌类型基础
 * 
 * 通过添加唯一符号来创建名义类型，防止类型混淆
 * 
 * @example
 * ```ts
 * type UserId = Brand<string, 'UserId'>
 * type OrderId = Brand<string, 'OrderId'>
 * 
 * const userId: UserId = 'user_123' as UserId
 * const orderId: OrderId = 'order_456' as OrderId
 * 
 * // 类型错误：不能将 UserId 赋值给 OrderId
 * // const badId: OrderId = userId
 * ```
 */
declare const __brand: unique symbol

/**
 * 品牌类型
 * 
 * @typeParam T - 基础类型
 * @typeParam B - 品牌标识
 */
export type Brand<T, B extends string> = T & { readonly [__brand]: B }

/**
 * 创建品牌值
 * 
 * @param value - 原始值
 * @returns 品牌化的值
 */
export function brand<T, B extends string>(value: T): Brand<T, B> {
  return value as Brand<T, B>
}

// ============================================================================
// 包相关的品牌类型
// ============================================================================

/**
 * NPM 包名称
 * 
 * 确保字符串是有效的包名格式
 */
export type PackageName = Brand<string, 'PackageName'>

/**
 * 语义化版本号
 * 
 * 确保字符串符合 semver 格式
 */
export type SemverVersion = Brand<string, 'SemverVersion'>

/**
 * NPM Registry URL
 */
export type RegistryUrl = Brand<string, 'RegistryUrl'>

/**
 * Git Commit Hash
 */
export type GitCommitHash = Brand<string, 'GitCommitHash'>

/**
 * Git Tag
 */
export type GitTag = Brand<string, 'GitTag'>

/**
 * Git Branch 名称
 */
export type GitBranch = Brand<string, 'GitBranch'>

/**
 * 文件路径（绝对路径）
 */
export type AbsolutePath = Brand<string, 'AbsolutePath'>

/**
 * 相对路径
 */
export type RelativePath = Brand<string, 'RelativePath'>

/**
 * NPM Token
 */
export type NpmToken = Brand<string, 'NpmToken'>

/**
 * OTP 验证码
 */
export type OtpCode = Brand<string, 'OtpCode'>

// ============================================================================
// 类型守卫函数
// ============================================================================

/**
 * 检查值是否已定义（非 null 且非 undefined）
 * 
 * @param value - 要检查的值
 * @returns 是否已定义
 * 
 * @example
 * ```ts
 * const values = [1, null, 2, undefined, 3]
 * const defined = values.filter(isDefined) // [1, 2, 3]
 * ```
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * 检查值是否为字符串
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 检查值是否为数字
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

/**
 * 检查值是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * 检查值是否为函数
 */
export function isFunction(value: unknown): value is Function {
  return typeof value === 'function'
}

/**
 * 检查值是否为对象（非 null）
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 检查值是否为数组
 */
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value)
}

/**
 * 检查值是否为非空字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0
}

/**
 * 检查值是否为非空数组
 */
export function isNonEmptyArray<T>(value: unknown): value is [T, ...T[]] {
  return isArray(value) && value.length > 0
}

/**
 * 检查值是否为 Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    value instanceof Promise ||
    (isObject(value) &&
      isFunction((value as any).then) &&
      isFunction((value as any).catch))
  )
}

/**
 * 检查值是否为 Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error
}

/**
 * 检查值是否为 Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime())
}

/**
 * 检查值是否为正整数
 */
export function isPositiveInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value > 0
}

/**
 * 检查值是否为非负整数
 */
export function isNonNegativeInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 0
}

// ============================================================================
// 包相关的类型守卫
// ============================================================================

/** NPM 包名正则 */
const PACKAGE_NAME_REGEX = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/

/**
 * 检查是否为有效的 NPM 包名
 * 
 * @param value - 要检查的值
 * @returns 是否为有效包名
 * 
 * @example
 * ```ts
 * isValidPackageName('lodash') // true
 * isValidPackageName('@scope/pkg') // true
 * isValidPackageName('INVALID') // false
 * ```
 */
export function isValidPackageName(value: unknown): value is PackageName {
  if (!isString(value)) return false
  if (value.length > 214) return false
  return PACKAGE_NAME_REGEX.test(value)
}

/** 语义化版本正则 */
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

/**
 * 检查是否为有效的语义化版本
 * 
 * @param value - 要检查的值
 * @returns 是否为有效版本号
 * 
 * @example
 * ```ts
 * isValidSemver('1.0.0') // true
 * isValidSemver('1.0.0-alpha.1') // true
 * isValidSemver('1.0') // false
 * ```
 */
export function isValidSemver(value: unknown): value is SemverVersion {
  if (!isString(value)) return false
  return SEMVER_REGEX.test(value)
}

/** Git commit hash 正则 */
const GIT_COMMIT_HASH_REGEX = /^[0-9a-f]{7,40}$/i

/**
 * 检查是否为有效的 Git commit hash
 */
export function isValidGitCommitHash(value: unknown): value is GitCommitHash {
  if (!isString(value)) return false
  return GIT_COMMIT_HASH_REGEX.test(value)
}

/** Git branch 名称正则 */
const GIT_BRANCH_REGEX = /^(?!.*(?:\/\.|\.\.|\/{2}|@\{|\\))(?!.*(?:\.lock$|[\x00-\x1f\x7f ~^:?*\[]))[\w./-]+$/

/**
 * 检查是否为有效的 Git branch 名称
 */
export function isValidGitBranch(value: unknown): value is GitBranch {
  if (!isString(value)) return false
  if (value.startsWith('/') || value.endsWith('/')) return false
  return GIT_BRANCH_REGEX.test(value)
}

/** URL 正则 */
const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i

/**
 * 检查是否为有效的 Registry URL
 */
export function isValidRegistryUrl(value: unknown): value is RegistryUrl {
  if (!isString(value)) return false
  return URL_REGEX.test(value)
}

/** OTP 正则（6位数字） */
const OTP_REGEX = /^\d{6}$/

/**
 * 检查是否为有效的 OTP 验证码
 */
export function isValidOtp(value: unknown): value is OtpCode {
  if (!isString(value)) return false
  return OTP_REGEX.test(value)
}

// ============================================================================
// 类型断言辅助函数
// ============================================================================

/**
 * 创建包名
 * 
 * @param name - 包名字符串
 * @returns 品牌化的包名
 * @throws 如果包名无效
 */
export function createPackageName(name: string): PackageName {
  if (!isValidPackageName(name)) {
    throw new Error(`Invalid package name: ${name}`)
  }
  return name
}

/**
 * 创建语义化版本
 * 
 * @param version - 版本字符串
 * @returns 品牌化的版本号
 * @throws 如果版本号无效
 */
export function createSemverVersion(version: string): SemverVersion {
  if (!isValidSemver(version)) {
    throw new Error(`Invalid semver version: ${version}`)
  }
  return version
}

/**
 * 创建 Registry URL
 * 
 * @param url - URL 字符串
 * @returns 品牌化的 URL
 * @throws 如果 URL 无效
 */
export function createRegistryUrl(url: string): RegistryUrl {
  if (!isValidRegistryUrl(url)) {
    throw new Error(`Invalid registry URL: ${url}`)
  }
  return url
}

// ============================================================================
// 实用类型
// ============================================================================

/**
 * 深度部分化
 * 
 * 递归地将所有属性设为可选
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T

/**
 * 深度只读
 * 
 * 递归地将所有属性设为只读
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T

/**
 * 深度必需
 * 
 * 递归地将所有属性设为必需
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T

/**
 * 获取函数参数类型
 */
export type Parameters<T extends (...args: any) => any> = T extends (
  ...args: infer P
) => any
  ? P
  : never

/**
 * 获取函数返回类型
 */
export type ReturnType<T extends (...args: any) => any> = T extends (
  ...args: any
) => infer R
  ? R
  : never

/**
 * 获取 Promise 解析后的类型
 */
export type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T

/**
 * 必需的键
 */
export type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K
}[keyof T]

/**
 * 可选的键
 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never
}[keyof T]

/**
 * 只挑选指定类型的键
 */
export type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P]
}

/**
 * 排除指定类型的键
 */
export type OmitByType<T, U> = {
  [P in keyof T as T[P] extends U ? never : P]: T[P]
}

/**
 * 字符串字面量联合类型转换为联合类型
 */
export type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never

/**
 * 非空值
 */
export type NonNullable<T> = T extends null | undefined ? never : T

/**
 * 确保类型为数组
 */
export type Arrayable<T> = T | T[]

/**
 * 确保类型为 Promise
 */
export type Promisable<T> = T | Promise<T>

/**
 * 可空类型
 */
export type Nullable<T> = T | null

/**
 * 可选类型
 */
export type Maybe<T> = T | null | undefined

/**
 * 字符串或数字索引签名
 */
export type Dict<T = any> = Record<string, T>

/**
 * 只读字典
 */
export type ReadonlyDict<T = any> = Readonly<Dict<T>>

// ============================================================================
// 结果类型（用于错误处理）
// ============================================================================

/**
 * 成功结果
 */
export interface Success<T> {
  readonly success: true
  readonly value: T
}

/**
 * 失败结果
 */
export interface Failure<E = Error> {
  readonly success: false
  readonly error: E
}

/**
 * 结果类型
 * 
 * 用于表示可能失败的操作结果
 * 
 * @example
 * ```ts
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return { success: false, error: 'Division by zero' }
 *   }
 *   return { success: true, value: a / b }
 * }
 * 
 * const result = divide(10, 2)
 * if (result.success) {
 *   console.log(result.value) // 5
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export type Result<T, E = Error> = Success<T> | Failure<E>

/**
 * 创建成功结果
 */
export function success<T>(value: T): Success<T> {
  return { success: true, value }
}

/**
 * 创建失败结果
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error }
}

/**
 * 检查是否为成功结果
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.success
}

/**
 * 检查是否为失败结果
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return !result.success
}

/**
 * 从结果中提取值，失败时返回默认值
 */
export function getOrDefault<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.value : defaultValue
}

/**
 * 从结果中提取值，失败时抛出错误
 */
export function getOrThrow<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.value
  }
  throw result.error instanceof Error ? result.error : new Error(String(result.error))
}

/**
 * 映射成功结果的值
 */
export function mapResult<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U
): Result<U, E> {
  if (result.success) {
    return success(fn(result.value))
  }
  return result
}

/**
 * 映射失败结果的错误
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (!result.success) {
    return failure(fn(result.error))
  }
  return result
}
