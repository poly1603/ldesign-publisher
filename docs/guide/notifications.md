# 通知系统

Publisher 内置了强大的通知系统，支持多种主流通讯工具，让你实时获取发布状态。

## 支持的通知渠道

- 🐝 **钉钉** - 支持签名、@人员
- 📢 **企业微信** - 支持 @用户、@手机号
- 📧 **Slack** - 支持自定义频道、用户名
- ✉️ **邮件** - 支持 SMTP（需要 nodemailer）
- 🔗 **自定义 Webhook** - 支持任意 HTTP API

## 基础配置

在 `publisher.config.ts` 中配置通知：

```typescript
export default defineConfig({
  notifications: {
    enabled: true,
    channels: [
      {
        type: 'dingtalk',
        when: ['success', 'failure'],
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
        },
      },
    ],
  },
})
```

## 钉钉通知

### 基础配置

```typescript
{
  type: 'dingtalk',
  name: '钉钉通知',
  when: ['success', 'failure'],
  config: {
    webhook: process.env.DINGTALK_WEBHOOK,
  },
}
```

### 加签配置

```typescript
{
  type: 'dingtalk',
  config: {
    webhook: process.env.DINGTALK_WEBHOOK,
    secret: process.env.DINGTALK_SECRET, // 加签密钥
  },
}
```

### @指定人员

```typescript
{
  type: 'dingtalk',
  config: {
    webhook: process.env.DINGTALK_WEBHOOK,
    atMobiles: ['13800138000'], // @指定手机号
    atAll: false, // 是否@所有人
  },
}
```

## 企业微信通知

```typescript
{
  type: 'wecom',
  when: ['failure'], // 只在失败时通知
  config: {
    webhook: process.env.WECOM_WEBHOOK,
    mentionedList: ['@all'], // @所有人
    // 或指定用户
    mentionedList: ['user1', 'user2'],
    // 或指定手机号
    mentionedMobileList: ['13800138000'],
  },
}
```

## Slack 通知

```typescript
{
  type: 'slack',
  config: {
    webhook: process.env.SLACK_WEBHOOK,
    channel: '#releases', // 频道
    username: 'Publisher Bot', // 用户名
    iconEmoji: ':rocket:', // emoji 图标
  },
}
```

## 邮件通知

::: warning 注意
邮件通知需要安装 `nodemailer`：
```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```
:::

```typescript
{
  type: 'email',
  config: {
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    from: 'publisher@example.com',
    to: ['team@example.com'],
    cc: ['manager@example.com'], // 抄送
    subject: '发布通知 - {title}', // 可选
  },
}
```

## 自定义 Webhook

支持任意 HTTP API：

```typescript
{
  type: 'webhook',
  config: {
    url: 'https://api.example.com/notify',
    method: 'POST', // GET | POST | PUT
    headers: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    query: { // 查询参数
      source: 'publisher',
    },
    bodyTemplate: JSON.stringify({ // 请求体模板
      title: '{{title}}',
      content: '{{content}}',
      type: '{{type}}',
      timestamp: '{{timestamp}}',
    }),
  },
}
```

## 触发条件

通过 `when` 字段控制通知触发条件：

```typescript
{
  when: ['success'],  // 仅成功时通知
}

{
  when: ['failure'],  // 仅失败时通知
}

{
  when: ['success', 'failure'],  // 成功和失败都通知
}

{
  when: ['always'],  // 总是通知（默认）
}
```

## 完整示例

```typescript
export default defineConfig({
  notifications: {
    enabled: true,
    
    // 默认触发条件
    defaultTriggers: ['success', 'failure'],
    
    // 是否包含详细信息
    includeDetails: true,
    
    // 超时时间（毫秒）
    timeout: 10000,
    
    // 重试次数
    retries: 2,
    
    channels: [
      // 钉钉 - 用于团队通知
      {
        type: 'dingtalk',
        name: '团队通知',
        when: ['success', 'failure'],
        config: {
          webhook: process.env.DINGTALK_WEBHOOK,
          secret: process.env.DINGTALK_SECRET,
        },
      },
      
      // 企业微信 - 仅失败时通知
      {
        type: 'wecom',
        name: '失败告警',
        when: ['failure'],
        config: {
          webhook: process.env.WECOM_WEBHOOK,
          mentionedList: ['@all'],
        },
      },
      
      // Slack - 用于国际团队
      {
        type: 'slack',
        name: 'Releases',
        enabled: process.env.NODE_ENV === 'production',
        config: {
          webhook: process.env.SLACK_WEBHOOK,
          channel: '#releases',
        },
      },
      
      // 自定义 API
      {
        type: 'webhook',
        name: '内部系统',
        config: {
          url: 'https://internal-api.com/publish-notify',
          headers: {
            'Authorization': `Bearer ${process.env.INTERNAL_TOKEN}`,
          },
        },
      },
    ],
  },
})
```

## 通知消息格式

通知消息包含以下信息：

### 成功通知

```markdown
✅ 发布成功

**状态**: ✅ 成功
**耗时**: 45.2s

**成功发布** (3):
  - @mycompany/core@1.0.0
  - @mycompany/utils@1.0.0
  - @mycompany/components@1.0.0

**已跳过** (1): @mycompany/private
```

### 失败通知

```markdown
❌ 发布失败

**状态**: ❌ 失败
**耗时**: 12.3s

**发布失败** (1):
  - @mycompany/core: 网络错误

**错误详情**:
  - 连接超时
  - 请检查网络连接
```

## 环境变量管理

推荐使用环境变量管理敏感信息：

### .env 文件

```bash
# 钉钉
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=SECxxx

# 企业微信
WECOM_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx

# Slack
SLACK_WEBHOOK=https://hooks.slack.com/services/xxx

# 自定义 API
INTERNAL_TOKEN=xxx
```

### 使用环境变量

```typescript
export default defineConfig({
  notifications: {
    channels: [
      {
        type: 'dingtalk',
        config: {
          webhook: process.env.DINGTALK_WEBHOOK!,
          secret: process.env.DINGTALK_SECRET,
        },
      },
    ],
  },
})
```

## 测试通知

你可以在钩子中测试通知：

```typescript
import { createNotificationManager } from '@ldesign/publisher'

const manager = createNotificationManager({
  enabled: true,
  channels: [/* ... */],
})

// 发送测试通知
await manager.send({
  type: 'info',
  title: '测试通知',
  content: '这是一条测试消息',
})
```

## 常见问题

### 通知没有发送？

检查：
1. `notifications.enabled` 是否为 `true`
2. 通道的 `enabled` 是否为 `false`
3. `when` 条件是否匹配
4. Webhook URL 是否正确
5. 网络连接是否正常

### 如何禁用某个通道？

```typescript
{
  type: 'dingtalk',
  enabled: false, // 临时禁用
  config: {/* ... */},
}
```

### 如何自定义消息内容？

目前通知内容是自动生成的，你可以：
1. 使用自定义 Webhook 并指定 `bodyTemplate`
2. 在 `postPublish` 钩子中发送自定义通知

```typescript
hooks: {
  postPublish: async (report) => {
    // 自定义通知逻辑
    await sendCustomNotification(report)
  },
}
```

## 下一步

- 查看[配置参考](/config/notifications)了解所有选项
- 学习[钩子系统](/config/hooks)实现自定义通知逻辑
- 了解[最佳实践](/guide/team-workflow)的团队协作方式
