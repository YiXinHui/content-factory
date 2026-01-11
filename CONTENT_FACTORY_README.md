# 流淌内容工厂 - 项目说明文档

## 项目概述

**流淌内容工厂**是一个基于 AI 的内容创作工作流系统，专为知识型 IP 设计。它能够将录音转写文本通过 5 位"数字员工"的协作，转化为可发布的结构化内容。

### 核心理念

> "让 AI 隐形，让智能可见"

用户无需感知底层 AI 的存在，只需与 5 位专业的数字员工协作，即可完成从原始素材到成品内容的全流程创作。

## 技术架构

### 技术栈

- **前端框架**: Next.js 16 (App Router)
- **UI 组件**: shadcn/ui + Tailwind CSS
- **数据库**: PostgreSQL (Drizzle ORM)
- **AI 服务**: OpenAI API (gpt-4.1-mini)
- **认证**: NextAuth.js

### 项目结构

```
content-factory/
├── app/
│   ├── (auth)/                 # 认证相关页面
│   └── (chat)/
│       ├── api/workflow/       # 工作流 API 路由
│       ├── factory/            # 工厂首页
│       └── workflow/           # 工作流页面
│           ├── [projectId]/
│           │   ├── mining/     # 内容挖掘
│           │   ├── analysis/   # 内容分析
│           │   ├── director/   # 编导
│           │   ├── copywriter/ # 文案
│           │   └── planning/   # 选题策划
├── components/
│   └── workflow/               # 工作流组件
├── lib/
│   ├── ai/
│   │   └── workflow-prompts.ts # AI Prompts 配置
│   └── db/
│       ├── schema.ts           # 数据库表结构
│       └── queries.ts          # 数据库查询函数
```

## 数字员工介绍

### 1. 内容挖掘师 🔍

**职责**: 从原始文本中发现 3-5 个高价值主题

**输出**:
- 主题标题
- 核心观点
- 情感浓度 (1-5)
- 支撑素材统计
- 原文高亮定位
- 挖掘理由

### 2. 内容分析师 📊

**职责**: 对选中主题进行五步深度分析

**输出**:
- 核心观点提炼
- 认知对比（大众认知 vs 我们的观点）
- 逻辑链条（因为-所以-而且）
- 传播元素（金句、案例、数据）
- 受众问题预判

### 3. 编导 🎬

**职责**: 设计短视频切片剪辑方案

**输出**:
- 内容类型判断
- 推荐剪辑结构
- 剪辑点定位
- 补录建议
- 成品预览

### 4. 文案 ✍️

**职责**: 通过四步协作生成完整文案

**四步流程**:
1. 推荐公式 - 选择最适合的文案结构
2. 生成结构 - 创建文章骨架
3. 创作标题 - 生成 8-10 个吸睛标题
4. 撰写全文 - 生成完整内容

### 5. 选题策划 💡

**职责**: 围绕已完成内容发散新选题

**发散方向**:
- ⬆️ 向上：原因探究
- ⬇️ 向下：结果预测
- ➡️ 平行：相关场景

## 数据库表结构

### 核心表

| 表名 | 说明 |
|------|------|
| Project | 项目表，存储原始文本和当前阶段 |
| Topic | 主题表，内容挖掘师的产出 |
| Analysis | 分析表，内容分析师的产出 |
| Output | 产出物表，编导/文案的产出 |
| NewTopic | 新选题表，选题策划的产出 |

### 关系图

```
Project (1) ──> (n) Topic (1) ──> (1) Analysis (1) ──> (n) Output (1) ──> (n) NewTopic
```

## API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/workflow` | POST | 创建新项目 |
| `/api/workflow` | GET | 获取项目列表 |
| `/api/workflow/mining` | POST | 执行内容挖掘 |
| `/api/workflow/analysis` | POST | 执行深度分析 |
| `/api/workflow/director` | POST | 生成编导方案 |
| `/api/workflow/copywriter` | POST | 文案四步协作 |
| `/api/workflow/planning` | POST | 发散新选题 |

## 页面路由

| 路由 | 说明 |
|------|------|
| `/factory` | 工厂首页，创建项目和查看历史 |
| `/workflow/[projectId]/mining` | 内容挖掘工位 |
| `/workflow/[projectId]/analysis/[topicId]` | 内容分析工位 |
| `/workflow/[projectId]/director/[analysisId]` | 编导工位 |
| `/workflow/[projectId]/copywriter/[analysisId]` | 文案工位 |
| `/workflow/[projectId]/planning/[outputId]` | 选题策划工位 |

## 环境配置

### 必需环境变量

```env
# 认证密钥
AUTH_SECRET=your-auth-secret

# 数据库连接
POSTGRES_URL=postgresql://user:password@host:5432/database

# OpenAI API（如果使用默认配置则无需设置）
OPENAI_API_KEY=your-openai-api-key
```

## 部署说明

### 本地开发

```bash
# 安装依赖
pnpm install

# 运行数据库迁移
pnpm db:migrate

# 启动开发服务器
pnpm dev
```

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 部署

## 使用流程

1. **访问工厂首页** (`/factory`)
2. **粘贴录音转写文本**，创建新项目
3. **内容挖掘**：AI 自动发现高价值主题
4. **选择主题**：点击感兴趣的主题进行深度分析
5. **查看分析报告**：了解核心观点、认知对比等
6. **选择路径**：
   - A1 路径：进入编导工位，生成剪辑方案
   - A2 路径：进入文案工位，四步协作生成文案
7. **选题策划**：围绕已完成内容发散新选题
8. **循环创作**：使用新选题开始新一轮创作

## 扩展建议

### 短期优化

- [ ] 添加内容导出功能（Markdown/Word）
- [ ] 支持批量处理多个主题
- [ ] 添加历史版本对比

### 长期规划

- [ ] 集成更多 AI 模型选择
- [ ] 添加团队协作功能
- [ ] 支持多语言内容创作
- [ ] 集成发布平台 API

## 许可证

MIT License

---

**流淌内容工厂** - 让知识型 IP 的内容创作更高效
