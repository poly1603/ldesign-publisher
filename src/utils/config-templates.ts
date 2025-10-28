/**
 * 配置模板管理
 */

import type { PublisherConfig } from '../types/config.js'

/**
 * 模板类型
 */
export type ConfigTemplate = 'standard' | 'monorepo' | 'beta' | 'hotfix' | 'minimal'

/**
 * 模板元数据
 */
export interface TemplateMetadata {
  name: string
  description: string
  suitable: string[]
  config: Partial<PublisherConfig>
}

/**
 * 标准发布模板
 */
const standardTemplate: TemplateMetadata = {
  name: 'Standard',
  description: '标准发布配置，适合大多数项目',
  suitable: ['单包项目', '开源项目', '通用场景'],
  config: {
    versionStrategy: 'independent',
    
    publish: {
      access: 'public',
      tag: 'latest',
      confirm: true,
      parallel: false,
      retries: 2,
    },
    
    changelog: {
      enabled: true,
      conventional: true,
      output: 'CHANGELOG.md',
      includeAuthors: true,
      includePRLinks: true,
    },
    
    validation: {
      requireCleanWorkingDirectory: true,
      allowedBranches: ['main', 'master'],
      requireTests: true,
      requireBuild: true,
      scanSensitiveData: true,
      maxPackageSize: 10 * 1024 * 1024, // 10MB
    },
    
    git: {
      createTag: true,
      tagPrefix: 'v',
      pushTag: true,
      createCommit: true,
      commitMessage: 'chore(release): publish {version}',
      pushCommit: true,
    },
    
    hooks: {
      prePublish: 'npm test',
    },
  },
}

/**
 * Monorepo 模板
 */
const monorepoTemplate: TemplateMetadata = {
  name: 'Monorepo',
  description: 'Monorepo 项目配置，支持批量发布和依赖解析',
  suitable: ['Monorepo 项目', 'Lerna 项目', 'pnpm workspace'],
  config: {
    versionStrategy: 'independent',
    
    publish: {
      access: 'public',
      tag: 'latest',
      confirm: true,
      parallel: true, // Monorepo 启用并行发布
      retries: 2,
    },
    
    changelog: {
      enabled: true,
      conventional: true,
      output: 'CHANGELOG.md',
      includeAuthors: true,
      includePRLinks: true,
    },
    
    validation: {
      requireCleanWorkingDirectory: true,
      allowedBranches: ['main', 'master'],
      requireTests: true,
      requireBuild: true,
      scanSensitiveData: true,
    },
    
    git: {
      createTag: true,
      tagPrefix: 'v',
      pushTag: true,
      createCommit: true,
      commitMessage: 'chore(release): publish packages',
      pushCommit: true,
    },
    
    monorepo: {
      useWorkspaces: true,
      workspaceProtocol: 'pnpm',
      updateWorkspaceDependencies: true,
      ignorePrivate: true,
      topologicalSort: true,
      publishOrder: 'auto',
    },
    
    concurrency: 4,
    
    hooks: {
      prePublish: 'pnpm test',
    },
  },
}

/**
 * Beta 版本模板
 */
const betaTemplate: TemplateMetadata = {
  name: 'Beta Release',
  description: 'Beta 版本发布配置，适合预发布测试',
  suitable: ['Beta 版本', '预发布', '测试版本'],
  config: {
    versionStrategy: 'independent',
    
    publish: {
      access: 'public',
      tag: 'beta', // 使用 beta tag
      confirm: false, // Beta 版本可以快速发布
      parallel: true,
      retries: 1,
    },
    
    changelog: {
      enabled: false, // Beta 版本不生成 changelog
    },
    
    validation: {
      requireCleanWorkingDirectory: false, // 放宽验证
      allowedBranches: ['develop', 'beta', 'main', 'master'],
      requireTests: false,
      requireBuild: true,
      scanSensitiveData: true,
    },
    
    git: {
      createTag: true,
      tagPrefix: 'v',
      pushTag: false, // Beta 版本不推送 tag
      createCommit: false,
      pushCommit: false,
    },
  },
}

/**
 * 热修复模板
 */
const hotfixTemplate: TemplateMetadata = {
  name: 'Hotfix',
  description: '热修复发布配置，快速修复线上问题',
  suitable: ['紧急修复', '线上问题', 'Patch 版本'],
  config: {
    versionStrategy: 'independent',
    
    publish: {
      access: 'public',
      tag: 'latest',
      confirm: true,
      parallel: false, // 热修复串行发布更安全
      retries: 3,
    },
    
    changelog: {
      enabled: true,
      conventional: true,
      output: 'CHANGELOG.md',
    },
    
    validation: {
      requireCleanWorkingDirectory: true,
      allowedBranches: ['hotfix', 'main', 'master'],
      requireTests: true, // 热修复必须测试
      requireBuild: true,
      scanSensitiveData: true,
    },
    
    git: {
      createTag: true,
      tagPrefix: 'v',
      pushTag: true,
      createCommit: true,
      commitMessage: 'chore(hotfix): {version}',
      pushCommit: true,
    },
    
    hooks: {
      prePublish: 'npm test',
      postPublish: async () => {
        console.log('⚠️  热修复已发布，请及时通知相关人员')
      },
    },
  },
}

/**
 * 最小化模板
 */
const minimalTemplate: TemplateMetadata = {
  name: 'Minimal',
  description: '最小化配置，仅包含必需选项',
  suitable: ['简单项目', '快速开始', '自定义配置'],
  config: {
    versionStrategy: 'independent',
    
    publish: {
      access: 'public',
      tag: 'latest',
    },
    
    validation: {
      requireCleanWorkingDirectory: true,
    },
  },
}

/**
 * 所有模板
 */
export const templates: Record<ConfigTemplate, TemplateMetadata> = {
  standard: standardTemplate,
  monorepo: monorepoTemplate,
  beta: betaTemplate,
  hotfix: hotfixTemplate,
  minimal: minimalTemplate,
}

/**
 * 获取模板
 */
export function getTemplate(name: ConfigTemplate): TemplateMetadata {
  return templates[name]
}

/**
 * 获取所有模板列表
 */
export function getAllTemplates(): TemplateMetadata[] {
  return Object.values(templates)
}

/**
 * 生成配置文件内容
 */
export function generateConfigFileContent(template: ConfigTemplate, format: 'ts' | 'js' = 'ts'): string {
  const config = templates[template].config
  const configStr = JSON.stringify(config, null, 2)
    .replace(/"([^"]+)":/g, '$1:') // 移除键的引号
    .replace(/: "([^"]+)"/g, ": '$1'") // 使用单引号
    .replace(/async \(\) => {[^}]+}/g, (match) => match.replace(/\\n/g, '\n    ')) // 格式化函数

  if (format === 'ts') {
    return `import { defineConfig } from '@ldesign/publisher'

export default defineConfig(${configStr})
`
  } else {
    return `const { defineConfig } = require('@ldesign/publisher')

module.exports = defineConfig(${configStr})
`
  }
}

/**
 * 生成注释化的配置文件
 */
export function generateCommentedConfig(format: 'ts' | 'js' = 'ts'): string {
  const importLine = format === 'ts' 
    ? "import { defineConfig } from '@ldesign/publisher'"
    : "const { defineConfig } = require('@ldesign/publisher')"
  
  const exportLine = format === 'ts' 
    ? 'export default defineConfig({'
    : 'module.exports = defineConfig({'

  return `${importLine}

${exportLine}
  // ==================== 基础配置 ====================
  
  /** 工作目录 */
  // cwd: process.cwd(),

  /** 版本策略: 'fixed'(统一版本) | 'independent'(独立版本) */
  versionStrategy: 'independent',

  // ==================== Registry 配置 ====================
  
  /** NPM Registry 配置 */
  // registries: {
  //   public: {
  //     url: 'https://registry.npmjs.org',
  //     access: 'public',
  //   },
  //   private: {
  //     url: 'https://npm.example.com',
  //     token: process.env.NPM_TOKEN,
  //     scopes: ['@mycompany'],
  //   },
  // },

  /** 默认 Registry */
  // defaultRegistry: 'public',

  // ==================== 发布配置 ====================
  
  publish: {
    /** 访问级别 */
    access: 'public',
    
    /** 发布 tag */
    tag: 'latest',
    
    /** 发布前确认 */
    confirm: true,
    
    /** 是否并行发布 */
    parallel: false,
    
    /** 重试次数 */
    retries: 2,
  },

  // ==================== Changelog 配置 ====================
  
  changelog: {
    /** 是否启用 */
    enabled: true,
    
    /** 使用 Conventional Commits */
    conventional: true,
    
    /** 输出文件 */
    output: 'CHANGELOG.md',
    
    /** 包含作者信息 */
    includeAuthors: true,
    
    /** 包含 PR 链接 */
    includePRLinks: true,
  },

  // ==================== 验证配置 ====================
  
  validation: {
    /** 要求工作区干净 */
    requireCleanWorkingDirectory: true,
    
    /** 允许的分支 */
    allowedBranches: ['main', 'master'],
    
    /** 要求测试通过 */
    requireTests: true,
    
    /** 要求构建成功 */
    requireBuild: true,
    
    /** 扫描敏感信息 */
    scanSensitiveData: true,
    
    /** 包大小限制 (bytes) */
    maxPackageSize: 10 * 1024 * 1024, // 10MB
  },

  // ==================== Git 配置 ====================
  
  git: {
    /** 创建 tag */
    createTag: true,
    
    /** Tag 前缀 */
    tagPrefix: 'v',
    
    /** 推送 tag */
    pushTag: true,
    
    /** 创建 commit */
    createCommit: true,
    
    /** Commit 消息模板 */
    commitMessage: 'chore(release): publish {version}',
    
    /** 推送 commit */
    pushCommit: true,
  },

  // ==================== Monorepo 配置 ====================
  
  // monorepo: {
  //   /** 使用工作空间 */
  //   useWorkspaces: true,
  //   
  //   /** 工作空间协议 */
  //   workspaceProtocol: 'pnpm',
  //   
  //   /** 更新工作空间依赖 */
  //   updateWorkspaceDependencies: true,
  //   
  //   /** 忽略私有包 */
  //   ignorePrivate: true,
  //   
  //   /** 拓扑排序 */
  //   topologicalSort: true,
  // },

  // ==================== 生命周期钩子 ====================
  
  hooks: {
    /** 发布前钩子 */
    prePublish: 'npm test',
    
    /** 发布后钩子 */
    // postPublish: async (report) => {
    //   console.log(\`✅ 发布成功！\`)
    // },
  },

  // ==================== 通知配置 🆕 ====================
  
  // notifications: {
  //   enabled: true,
  //   channels: [
  //     {
  //       type: 'dingtalk',
  //       name: '钉钉通知',
  //       when: ['success', 'failure'],
  //       config: {
  //         webhook: process.env.DINGTALK_WEBHOOK,
  //       },
  //     },
  //   ],
  // },

  // ==================== 其他配置 ====================
  
  /** 并发数 */
  // concurrency: 4,
  
  /** 调试模式 */
  // debug: false,
  
  /** 日志级别 */
  // logLevel: 'info',
})
`
}
