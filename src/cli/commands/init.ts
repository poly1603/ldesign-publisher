/**
 * Init 命令 - 初始化配置文件
 */

import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Command } from 'commander'
import inquirer from 'inquirer'
import chalk from 'chalk'
import {
  getAllTemplates,
  generateConfigFileContent,
  generateCommentedConfig,
  type ConfigTemplate,
} from '../../utils/config-templates.js'
import { logger } from '../../utils/logger.js'

export function createInitCommand(): Command {
  const command = new Command('init')

  command
    .description('初始化配置文件')
    .option('-t, --template <name>', '使用指定模板 (standard | monorepo | beta | hotfix | minimal)')
    .option('-f, --format <format>', '配置文件格式 (ts | js)', 'ts')
    .option('-o, --output <file>', '输出文件名')
    .option('--force', '覆盖已存在的配置文件')
    .option('--commented', '生成带注释的配置文件')
    .action(async (options) => {
      try {
        await handleInit(options)
      } catch (error: any) {
        logger.error(`初始化失败: ${error.message}`)
        process.exit(1)
      }
    })

  return command
}

async function handleInit(options: any): Promise<void> {
  logger.info('🚀 开始初始化 Publisher 配置...\n')

  // 确定配置文件名
  const format = options.format || 'ts'
  const defaultFileName = format === 'ts' ? 'publisher.config.ts' : 'publisher.config.js'
  const fileName = options.output || defaultFileName
  const filePath = resolve(process.cwd(), fileName)

  // 检查文件是否已存在
  if (existsSync(filePath) && !options.force) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `配置文件 ${chalk.cyan(fileName)} 已存在，是否覆盖？`,
        default: false,
      },
    ])

    if (!overwrite) {
      logger.info('已取消')
      return
    }
  }

  // 如果指定了模板，直接使用
  if (options.template) {
    await generateFromTemplate(options.template, filePath, format, options.commented)
    return
  }

  // 交互式选择
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'mode',
      message: '请选择配置方式:',
      choices: [
        { name: '📋 使用预设模板（推荐）', value: 'template' },
        { name: '📝 生成带注释的配置文件（适合自定义）', value: 'commented' },
      ],
    },
  ])

  if (answers.mode === 'template') {
    await selectAndGenerateTemplate(filePath, format)
  } else {
    await generateCommented(filePath, format)
  }
}

/**
 * 选择并生成模板
 */
async function selectAndGenerateTemplate(filePath: string, format: string): Promise<void> {
  const templates = getAllTemplates()

  // 显示模板列表
  const choices = templates.map((template) => ({
    name: `${chalk.bold(template.name)} - ${template.description}`,
    value: template.name.toLowerCase().replace(/\s+/g, '-'),
    short: template.name,
  }))

  const { templateName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'templateName',
      message: '请选择配置模板:',
      choices,
      pageSize: 10,
    },
  ])

  // 显示模板详情
  const template = templates.find(
    (t) => t.name.toLowerCase().replace(/\s+/g, '-') === templateName
  )

  if (template) {
    console.log('\n' + chalk.cyan('适用场景:'))
    template.suitable.forEach((s) => {
      console.log(`  • ${s}`)
    })
    console.log()
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: '确认使用此模板？',
      default: true,
    },
  ])

  if (!confirm) {
    logger.info('已取消')
    return
  }

  await generateFromTemplate(templateName as ConfigTemplate, filePath, format, false)
}

/**
 * 从模板生成配置
 */
async function generateFromTemplate(
  templateName: ConfigTemplate,
  filePath: string,
  format: string,
  commented: boolean,
): Promise<void> {
  const spinner = logger.startSpinner('生成配置文件...')

  try {
    let content: string

    if (commented) {
      content = generateCommentedConfig(format as 'ts' | 'js')
    } else {
      content = generateConfigFileContent(templateName, format as 'ts' | 'js')
    }

    writeFileSync(filePath, content, 'utf-8')

    logger.succeedSpinner(`✅ 配置文件已生成: ${chalk.cyan(filePath)}`)

    // 显示下一步提示
    console.log('\n' + chalk.bold('下一步:'))
    console.log(`  1. 根据需要调整 ${chalk.cyan(filePath)} 中的配置`)
    console.log(`  2. 运行 ${chalk.cyan('ldesign-publisher precheck')} 检查配置`)
    console.log(`  3. 运行 ${chalk.cyan('ldesign-publisher publish')} 开始发布\n`)
  } catch (error: any) {
    logger.failSpinner(`生成失败: ${error.message}`)
    throw error
  }
}

/**
 * 生成带注释的配置
 */
async function generateCommented(filePath: string, format: string): Promise<void> {
  const spinner = logger.startSpinner('生成配置文件...')

  try {
    const content = generateCommentedConfig(format as 'ts' | 'js')
    writeFileSync(filePath, content, 'utf-8')

    logger.succeedSpinner(`✅ 配置文件已生成: ${chalk.cyan(filePath)}`)

    console.log('\n' + chalk.yellow('💡 提示:'))
    console.log('  配置文件包含详细注释，您可以根据需要启用或调整配置项\n')

    console.log(chalk.bold('下一步:'))
    console.log(`  1. 编辑 ${chalk.cyan(filePath)} 启用所需配置`)
    console.log(`  2. 运行 ${chalk.cyan('ldesign-publisher precheck')} 检查配置`)
    console.log(`  3. 运行 ${chalk.cyan('ldesign-publisher publish')} 开始发布\n`)
  } catch (error: any) {
    logger.failSpinner(`生成失败: ${error.message}`)
    throw error
  }
}
