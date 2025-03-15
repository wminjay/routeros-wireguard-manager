# RouterOS WireGuard 配置管理器 (RouterOS WireGuard Configuration Manager)

[English](#english) | [中文](#chinese)

<a id="chinese"></a>
## 中文说明

这是一个用于管理RouterOS路由器上WireGuard配置的Web界面工具。

> **项目亮点**：此项目由 [Cursor AI](https://cursor.sh/) 主力完成，展示了人机协作编程的巨大潜力。
> 
> 开发过程中，人类开发者的主要贡献是：喝着咖啡☕，跷着二郎腿🦵，偶尔点击一下"继续"按钮⏩，然后继续欣赏AI编写的代码。

### AI主导开发（人类辅助点击）

本项目是由Cursor AI主导完成的全栈应用实例，人类开发者主要负责提供模糊需求和点击"继续"按钮：

- **前端开发**：React组件设计、状态管理和响应式UI（AI编写，人类审阅时几乎打了个盹💤）
- **后端开发**：Express API设计、RouterOS通信接口（AI完成，人类在旁边刷手机📱）
- **数据库设计**：SQLite数据模型和关系设计（AI构建，人类在思考午餐吃什么🍔）
- **国际化支持**：支持中英文双语界面（AI实现，人类在查看旅游攻略🏖️）
- **API集成**：与RouterOS API的无缝集成（AI搞定，人类在欣赏窗外风景🌄）

Cursor AI作为主要开发力量，通过智能编码大幅提升了开发效率，同时确保了代码质量和架构设计的先进性。人类开发者的贡献主要是：提出问题，然后点"继续"、"确认"、"可以"、"继续"、"好的"...

### 版本兼容性

**注意**: 本工具目前仅在 **RouterOS v7.6** 版本上进行过深入测试。其他版本可能存在兼容性问题：

- 理论上支持 RouterOS v6.47+ 和 v7.x 所有版本（这些版本支持WireGuard）
- 针对其他RouterOS版本的兼容性测试正在计划中
- 如果您在使用其他版本时遇到问题，请在Issues中报告

### 功能特点

- **一键创建**：在本系统创建WireGuard配置（包括私钥生成），然后自动导入到RouterOS
- **一键导出**：导出WireGuard配置，方便分享给对端设备
- **一键删除**：同时从本系统和RouterOS删除WireGuard配置
- **配置管理**：维护本地和RouterOS的配置同步
- **纯JavaScript实现**：使用tweetnacl库生成符合标准的WireGuard密钥，无需依赖wg命令行工具

### 系统架构

#### 前端
- 使用React创建响应式Web界面
- Material-UI提供现代化UI组件
- 使用状态管理（Context API或Redux）

#### 后端
- Node.js Express服务器
- 与RouterOS API通信
- 使用纯JavaScript管理WireGuard密钥生成（基于tweetnacl库）
- 不依赖任何外部命令行工具

#### 数据存储
- SQLite数据库存储本地配置信息
- 包括WireGuard对端信息、私钥等敏感数据

### 项目结构

本项目采用Monorepo结构：
```
/
├── packages/
│   ├── client/  # 前端React应用
│   ├── server/  # 后端Node.js应用
│   └── common/  # 前后端共享代码
└── package.json # 工作空间配置
```

### 配置结构

配置信息分为两部分：
1. **RouterOS中的配置** - 通过API查询和修改
2. **本地维护的配置** - 存储在本系统的数据库中，包括：
   - 对端私钥
   - 配置描述和标签
   - 创建日期和最后修改时间
   - 使用状态等

### 技术依赖

- Node.js & npm
- Express.js
- React
- SQLite/Sequelize
- RouterOS API 客户端
- TweetNaCl.js (用于WireGuard密钥生成)

### 开发指南

#### 安装依赖

```bash
npm install
```

#### 启动开发环境

```bash
# 启动前端
npm run start:client

# 启动后端
npm run start:server

# 同时启动前端和后端
npm run dev:all

# 代码检查
npm run lint

# 运行测试
npm run test:all

# 清理项目
npm run clean
```

### 安全说明

- 后端(server)和共享代码(common)包没有安全漏洞
- 前端开发依赖中存在一些已知漏洞，这些漏洞**仅影响开发环境**，不影响生产部署
- 详细信息请参阅 `packages/client/SECURITY.md`

<a id="english"></a>
## English

This is a web interface tool for managing WireGuard configurations on RouterOS routers.

> **Project Highlight**: This project was primarily developed by [Cursor AI](https://cursor.sh/), demonstrating the immense potential of human-AI collaborative programming.
> 
> During development, the human developer's main contributions were: sipping coffee☕, legs comfortably crossed🦵, occasionally clicking the "continue" button⏩, and then continuing to admire the AI-written code.

### AI-Driven Development (Human-Assisted Clicking)

This project is a full-stack application example primarily developed by Cursor AI, with humans mainly responsible for providing vague requirements and clicking the "continue" button:

- **Frontend Development**: React component design, state management, and responsive UI (AI-written while humans nearly dozed off💤)
- **Backend Development**: Express API design, RouterOS communication interface (AI-completed while humans scrolled through their phones📱)
- **Database Design**: SQLite data models and relationship design (AI-built while humans contemplated lunch options🍔)
- **Internationalization Support**: Bilingual interface implementation (AI-implemented while humans researched vacation spots🏖️)
- **API Integration**: Seamless integration with RouterOS API (AI-handled while humans enjoyed the view outside🌄)

Serving as the primary development force, Cursor AI dramatically improved development efficiency through intelligent coding while ensuring code quality and advanced architectural design. The human developer's contributions were mainly: asking questions, then clicking "continue", "confirm", "yes", "continue", "okay"...

### Version Compatibility

**Note**: This tool has currently only been thoroughly tested on **RouterOS v7.6**. Other versions may have compatibility issues:

- Theoretically supports RouterOS v6.47+ and all v7.x versions (which support WireGuard)
- Compatibility testing for other RouterOS versions is planned
- If you encounter issues with other versions, please report them in Issues

### Features

- **One-click Creation**: Create WireGuard configurations (including private key generation) in this system, then automatically import them to RouterOS
- **One-click Export**: Export WireGuard configurations for easy sharing with peer devices
- **One-click Deletion**: Delete WireGuard configurations simultaneously from both this system and RouterOS
- **Configuration Management**: Maintain synchronization between local and RouterOS configurations
- **Pure JavaScript Implementation**: Use the tweetnacl library to generate standard-compliant WireGuard keys, no need to rely on the wg command-line tool

### System Architecture

#### Frontend
- Responsive web interface created with React
- Modern UI components provided by Material-UI
- State management (Context API or Redux)

#### Backend
- Node.js Express server
- Communication with RouterOS API
- Pure JavaScript management of WireGuard key generation (based on tweetnacl library)
- No dependency on any external command-line tools

#### Data Storage
- SQLite database stores local configuration information
- Includes WireGuard peer information, private keys, and other sensitive data

### Project Structure

This project uses a Monorepo structure:
```
/
├── packages/
│   ├── client/  # Frontend React application
│   ├── server/  # Backend Node.js application
│   └── common/  # Shared code between frontend and backend
└── package.json # Workspace configuration
```

### Configuration Structure

Configuration information is divided into two parts:
1. **Configurations in RouterOS** - Queried and modified through API
2. **Locally maintained configurations** - Stored in the database of this system, including:
   - Peer private keys
   - Configuration descriptions and tags
   - Creation date and last modification time
   - Usage status, etc.

### Technical Dependencies

- Node.js & npm
- Express.js
- React
- SQLite/Sequelize
- RouterOS API client
- TweetNaCl.js (for WireGuard key generation)

### Development Guide

#### Installing Dependencies

```bash
npm install
```

#### Starting the Development Environment

```bash
# Start the frontend
npm run start:client

# Start the backend
npm run start:server

# Start both frontend and backend simultaneously
npm run dev:all

# Code linting
npm run lint

# Run tests
npm run test:all

# Clean the project
npm run clean
```

### Security Notes

- The backend (server) and shared code (common) packages have no security vulnerabilities
- There are some known vulnerabilities in the frontend development dependencies, but these vulnerabilities **only affect the development environment** and do not impact production deployment
- For detailed information, please refer to `packages/client/SECURITY.md`