import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@ldesign/publisher',
  description: '🚀 功能强大的 NPM 发布管理工具',
  base: '/publisher/',
  
  lang: 'zh-CN',
  
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#3c8772' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'zh-CN' }],
    ['meta', { property: 'og:title', content: '@ldesign/publisher | NPM 发布管理工具' }],
    ['meta', { property: 'og:site_name', content: '@ldesign/publisher' }],
  ],

  themeConfig: {
    logo: '/logo.svg',
    
    nav: [
      { text: '指南', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'API', link: '/api/core', activeMatch: '/api/' },
      { text: '配置', link: '/config/overview', activeMatch: '/config/' },
      { 
        text: '更多',
        items: [
          { text: 'Changelog', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
        ]
      },
      {
        text: 'v1.3.0',
        items: [
          { text: 'v1.3.0 (latest)', link: '/changelog' },
          { text: 'v1.2.0', link: '/versions/v1.2.0' },
          { text: 'v1.1.0', link: '/versions/v1.1.0' },
          { text: 'v1.0.0', link: '/versions/v1.0.0' },
        ]
      }
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '为什么选择 Publisher', link: '/guide/why' },
          ]
        },
        {
          text: '核心功能',
          items: [
            { text: '初始化配置', link: '/guide/init' },
            { text: '版本管理', link: '/guide/version' },
            { text: 'Changelog 生成', link: '/guide/changelog' },
            { text: '发布包', link: '/guide/publish' },
            { text: '发布回滚', link: '/guide/rollback' },
          ]
        },
        {
          text: '高级功能',
          items: [
            { text: '通知系统', link: '/guide/notifications' },
            { text: '环境诊断', link: '/guide/doctor' },
            { text: '发布预检查', link: '/guide/precheck' },
            { text: 'Dry-run 模式', link: '/guide/dry-run' },
            { text: '发布统计', link: '/guide/stats' },
          ]
        },
        {
          text: 'Monorepo',
          items: [
            { text: 'Monorepo 支持', link: '/guide/monorepo' },
            { text: '依赖解析', link: '/guide/dependency-resolution' },
            { text: '批量发布', link: '/guide/batch-publish' },
          ]
        },
        {
          text: '最佳实践',
          items: [
            { text: '项目配置', link: '/guide/project-setup' },
            { text: 'CI/CD 集成', link: '/guide/ci-cd' },
            { text: '团队协作', link: '/guide/team-workflow' },
            { text: '安全实践', link: '/guide/security' },
          ]
        }
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '核心 API', link: '/api/core' },
            { text: 'PublishManager', link: '/api/publish-manager' },
            { text: 'VersionManager', link: '/api/version-manager' },
            { text: 'ChangelogGenerator', link: '/api/changelog-generator' },
            { text: 'NotificationManager', link: '/api/notification-manager' },
            { text: 'RegistryManager', link: '/api/registry-manager' },
          ]
        },
        {
          text: '工具函数',
          items: [
            { text: 'Git 工具', link: '/api/git-utils' },
            { text: 'NPM 客户端', link: '/api/npm-client' },
            { text: '配置模板', link: '/api/config-templates' },
            { text: '缓存工具', link: '/api/cache' },
          ]
        },
        {
          text: '类型定义',
          items: [
            { text: '配置类型', link: '/api/types-config' },
            { text: '发布类型', link: '/api/types-publish' },
            { text: '通知类型', link: '/api/types-notification' },
          ]
        }
      ],
      '/config/': [
        {
          text: '配置指南',
          items: [
            { text: '配置概览', link: '/config/overview' },
            { text: '配置模板', link: '/config/templates' },
            { text: '完整配置示例', link: '/config/examples' },
          ]
        },
        {
          text: '配置选项',
          items: [
            { text: '基础配置', link: '/config/basic' },
            { text: '发布配置', link: '/config/publish' },
            { text: 'Registry 配置', link: '/config/registry' },
            { text: 'Git 配置', link: '/config/git' },
            { text: 'Monorepo 配置', link: '/config/monorepo' },
            { text: '验证配置', link: '/config/validation' },
            { text: '钩子配置', link: '/config/hooks' },
            { text: '通知配置', link: '/config/notifications' },
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ldesign/packages/publisher' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present LDesign Team'
    },

    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档'
              },
              modal: {
                noResultsText: '无法找到相关结果',
                resetButtonTitle: '清除查询条件',
                footer: {
                  selectText: '选择',
                  navigateText: '切换'
                }
              }
            }
          }
        }
      }
    },

    editLink: {
      pattern: 'https://github.com/ldesign/packages/publisher/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    docFooter: {
      prev: '上一页',
      next: '下一页'
    },

    outline: {
      label: '页面导航',
      level: [2, 3]
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '主题',
    lightModeSwitchTitle: '切换到浅色模式',
    darkModeSwitchTitle: '切换到深色模式',
  }
})
