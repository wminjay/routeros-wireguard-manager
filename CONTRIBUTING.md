# 贡献指南 (Contributing Guidelines)

[English](#english) | [中文](#chinese)

<a id="chinese"></a>
## 中文

感谢您对RouterOS WireGuard配置管理器项目的关注！我们非常欢迎您的贡献，无论是错误报告、功能请求还是代码贡献。

### 问题报告

如果您发现了bug或有新功能的想法，请先检查是否已有相关的issue。如果没有，请创建一个新的issue，并包含以下信息：

- 清晰的问题描述
- 复现步骤（如适用）
- 预期行为与实际行为
- 截图（如适用）
- 环境信息（操作系统、浏览器版本等）

### Pull请求流程

1. Fork这个仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m '添加了一些很棒的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个Pull请求

### 代码风格

- 请确保您的代码遵循项目现有的代码风格
- 提交前运行`npm run lint`确保代码符合代码规范
- 为新功能编写测试，确保通过`npm run test:all`

### 分支策略

- `main`: 稳定版本分支，用于发布
- `develop`: 开发分支，新功能合并到这里
- 特性分支: 从`develop`分支创建，命名为`feature/your-feature-name`
- 修复分支: 用于修复bug，命名为`fix/bug-description`

<a id="english"></a>
## English

Thank you for your interest in the RouterOS WireGuard Configuration Manager project! We welcome your contributions, whether they are bug reports, feature requests, or code contributions.

### Issue Reporting

If you find a bug or have an idea for a new feature, please first check if there is an existing issue. If not, create a new issue and include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Expected behavior vs. actual behavior
- Screenshots (if applicable)
- Environment information (OS, browser version, etc.)

### Pull Request Process

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Code Style

- Please ensure your code follows the existing code style of the project
- Run `npm run lint` before committing to ensure code compliance
- Write tests for new features and ensure they pass with `npm run test:all`

### Branch Strategy

- `main`: Stable version branch for releases
- `develop`: Development branch, new features merge here
- Feature branches: Created from `develop`, named `feature/your-feature-name`
- Fix branches: For bug fixes, named `fix/bug-description` 