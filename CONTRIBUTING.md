# 贡献指南

欢迎为 @ldesign/publisher 做出贡献！

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### 安装依赖

```bash
cd tools/publisher
pnpm install
```

### 开发

```bash
# 开发模式（监听文件变化）
pnpm dev

# 构建
pnpm build

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:coverage

# 类型检查
pnpm type-check

# 代码检查
pnpm lint
pnpm lint:fix
```

## 📁 项目结构

```
src/
├── types/              # 类型定义
├── core/               # 核心管理器
├── validators/         # 验证器
├── utils/              # 工具函数
├── cli/                # CLI 命令
│   └── commands/       # 各个命令
└── integrations/       # 第三方集成

__tests__/              # 测试文件
templates/              # 配置模板
bin/                    # CLI 入口
```

## 🔧 开发规范

### 代码风格

- 使用 TypeScript
- 遵循 ESLint 规则
- 使用 Prettier 格式化

### 命名规范

- **文件名**: kebab-case (如 `publish-manager.ts`)
- **类名**: PascalCase (如 `PublishManager`)
- **函数名**: camelCase (如 `createPublishManager`)
- **常量**: UPPER_SNAKE_CASE (如 `DEFAULT_TIMEOUT`)

### 注释规范

所有公共 API 必须包含 JSDoc 注释：

```typescript
/**
 * 函数简短描述
 * 
 * 详细说明（可选）
 * 
 * @param param1 - 参数1说明
 * @param param2 - 参数2说明
 * @returns 返回值说明
 * @throws {ErrorType} 异常说明
 * 
 * @example
 * ```typescript
 * const result = await func(param1, param2)
 * ```
 */
```

### 提交规范

使用 Conventional Commits 格式：

```
type(scope): subject

body

footer
```

**类型**:
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `refactor`: 代码重构
- `test`: 测试
- `chore`: 构建/工具

**示例**:
```
feat(core): 添加钩子系统

实现了完整的生命周期钩子管理，支持 8 个钩子点。

Closes #123
```

## 🧪 测试规范

### 测试文件命名

- 单元测试: `__tests__/<module>.test.ts`
- 集成测试: `__tests__/integration/<feature>.test.ts`
- E2E 测试: `__tests__/e2e/<scenario>.test.ts`

### 测试结构

```typescript
describe('ModuleName', () => {
  beforeEach(() => {
    // 设置
  })

  afterEach(() => {
    // 清理
  })

  it('should do something', () => {
    // 测试
  })
})
```

### 测试覆盖

- 核心模块: ≥ 80%
- 工具函数: ≥ 90%
- 类型定义: 100%

## 📝 Pull Request 流程

### 1. Fork 项目

### 2. 创建分支

```bash
git checkout -b feature/my-feature
```

### 3. 开发和测试

```bash
# 开发
pnpm dev

# 测试
pnpm test

# 检查
pnpm lint
pnpm type-check
```

### 4. 提交代码

```bash
git add .
git commit -m "feat: add new feature"
```

### 5. 推送并创建 PR

```bash
git push origin feature/my-feature
```

### 6. PR 检查清单

- [ ] 代码遵循项目风格
- [ ] 添加了必要的注释
- [ ] 添加了测试用例
- [ ] 所有测试通过
- [ ] 文档已更新
- [ ] Changelog 已更新

## 🐛 报告 Bug

### Bug 报告模板

```markdown
**描述**
简短描述 bug

**重现步骤**
1. 第一步
2. 第二步
3. ...

**期望行为**
应该发生什么

**实际行为**
实际发生了什么

**环境**
- OS: [e.g. Windows 10]
- Node.js: [e.g. 18.0.0]
- Publisher: [e.g. 1.2.0]

**额外信息**
其他相关信息
```

## 💡 功能建议

### 功能建议模板

```markdown
**功能描述**
清晰描述建议的功能

**使用场景**
为什么需要这个功能

**建议实现**
如何实现（可选）

**替代方案**
其他可能的实现方式（可选）
```

## 📚 参考资源

- [TypeScript 文档](https://www.typescriptlang.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semver 规范](https://semver.org/)
- [Vitest 文档](https://vitest.dev/)

## 🙏 致谢

感谢所有为 @ldesign/publisher 做出贡献的开发者！

---

**问题或建议？** 欢迎在 [Issues](https://github.com/ldesign/packages/publisher/issues) 中讨论！

