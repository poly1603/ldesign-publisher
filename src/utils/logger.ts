/**
 * 日志工具
 */

import chalk from 'chalk'
import ora, { type Ora } from 'ora'

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug' | 'verbose'

class Logger {
  private level: LogLevel = 'info'
  private spinner: Ora | null = null

  setLevel(level: LogLevel): void {
    this.level = level
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug', 'verbose']
    const currentIndex = levels.indexOf(this.level)
    const targetIndex = levels.indexOf(level)
    return targetIndex <= currentIndex
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(chalk.red('✖'), chalk.red(message), ...args)
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(chalk.yellow('⚠'), chalk.yellow(message), ...args)
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.blue('ℹ'), message, ...args)
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(chalk.green('✔'), chalk.green(message), ...args)
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(chalk.gray('◆'), chalk.gray(message), ...args)
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.shouldLog('verbose')) {
      console.log(chalk.gray('…'), chalk.gray(message), ...args)
    }
  }

  log(message: string, ...args: any[]): void {
    if (this.level !== 'silent') {
      console.log(message, ...args)
    }
  }

  /**
   * 创建 spinner
   */
  startSpinner(text: string): Ora {
    if (this.level !== 'silent') {
      this.spinner = ora(text).start()
      return this.spinner
    }
    return ora({ isSilent: true })
  }

  /**
   * 更新 spinner 文本
   */
  updateSpinner(text: string): void {
    if (this.spinner) {
      this.spinner.text = text
    }
  }

  /**
   * 成功停止 spinner
   */
  succeedSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.succeed(text)
      this.spinner = null
    }
  }

  /**
   * 失败停止 spinner
   */
  failSpinner(text?: string): void {
    if (this.spinner) {
      this.spinner.fail(text)
      this.spinner = null
    }
  }

  /**
   * 停止 spinner
   */
  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop()
      this.spinner = null
    }
  }

  /**
   * 打印分隔线
   */
  divider(): void {
    if (this.level !== 'silent') {
      console.log(chalk.gray('─'.repeat(50)))
    }
  }

  /**
   * 打印标题
   */
  title(text: string): void {
    if (this.level !== 'silent') {
      console.log()
      console.log(chalk.bold.cyan(text))
      this.divider()
    }
  }

  /**
   * 打印 JSON
   */
  json(data: any): void {
    if (this.level !== 'silent') {
      console.log(JSON.stringify(data, null, 2))
    }
  }
}

export const logger = new Logger()

