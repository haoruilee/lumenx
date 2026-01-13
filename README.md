# AI 短漫剧制作平台

一个基于 AI 的短漫剧/漫画视频制作平台，支持从剧本到成片的完整工作流。

## 技术栈

**前端**: Next.js 14 + React 18 + TypeScript + Tailwind CSS + Three.js  
**后端**: FastAPI + Python 3.11+  
**AI 服务**: 阿里云通义千问(Qwen) + 万相(Wanx)

## 快速开始

### 1. 环境准备

复制 `.env.example` 为 `.env` 并填入你的 API Keys：

```bash
cp .env.example .env
# 编辑 .env 文件，填入真实的 API Keys
```

### 2. 安装 FFmpeg（仅源码开发模式需要）

> **注意**: 如果您使用的是打包好的应用程序（.app 或 .exe），**无需安装 FFmpeg**，应用已内置。

如果您是在源码环境下开发运行，FFmpeg 用于视频拼接和导出。请根据您的操作系统安装：

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
```bash
# 方式1: 使用 winget
winget install ffmpeg

# 方式2: 手动下载
# 访问 https://www.gyan.dev/ffmpeg/builds/
# 下载 ffmpeg-release-essentials.zip
# 解压后将 bin 目录添加到系统 PATH
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install ffmpeg
```

**验证安装:**
```bash
ffmpeg -version
```

### 3. 后端启动

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 创建输出目录
mkdir -p output/uploads

# 启动 FastAPI 服务
python -m uvicorn src.apps.comic_gen.api:app --reload --host 0.0.0.0 --port 8000
```

后端服务将在 http://localhost:8000 启动  
API 文档: http://localhost:8000/docs

### 4. 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 http://localhost:3000 启动

## 项目结构

```
├── frontend/              # Next.js 前端应用
│   ├── src/
│   │   ├── app/          # App Router 页面
│   │   ├── components/   # React 组件
│   │   ├── lib/          # 工具库
│   │   └── store/        # 状态管理
│   └── package.json
├── src/                   # Python 后端代码
│   ├── apps/comic_gen/   # 核心应用
│   ├── models/           # AI 模型封装
│   ├── utils/            # 工具函数
│   └── config.py
├── demand/                # 文档
│   ├── 平台核心代码说明.md
│   └── AI漫剧制作全流程SOP.md
├── requirements.txt       # Python 依赖
└── .env.example          # 环境变量模板
```

## 核心功能

1. **剧本分析**: 输入小说/剧本，AI 自动提取角色、场景、道具和分镜
2. **美术指导**: AI 推荐视觉风格，支持自定义风格参数
3. **素材生成**: 为角色、场景、道具生成 AI 图片
4. **分镜编辑**: 可视化画布，拖拽素材组合分镜
5. **视频生成**: 基于分镜图生成动态视频
6. **音频混音**: 角色配音 + 环境音效 + 背景音乐
7. **成片导出**: 合并视频和音频，导出最终作品

## 详细文档

- [用户手册](USER_MANUAL.md) — **首次使用必读**
- [平台核心代码说明](demand/平台核心代码说明.md)
- [云创 AI 漫剧制作全流程 SOP](demand/AI漫剧制作全流程SOP.md)

## API 文档

启动后端服务后，访问 http://localhost:8000/docs 查看完整的 API 文档。

## 配置说明

### API Key 配置

应用支持两种配置存储方式，根据运行模式自动选择：

#### 开发模式 (Development)

配置存储在项目根目录的 `.env` 文件中：

```bash
# 通义千问/万相 API Key (必需)
DASHSCOPE_API_KEY=sk-xxxxxxxx

# 阿里云 RAM 用户 Access Key (OSS 功能需要)
ALIBABA_CLOUD_ACCESS_KEY_ID=LTAIxxx
ALIBABA_CLOUD_ACCESS_KEY_SECRET=xxx
```

#### 打包应用模式 (Packaged App)

配置存储在用户主目录下，确保配置不会泄露：

| 操作系统 | 配置文件路径 |
|---------|-------------|
| macOS/Linux | `~/.lumen-x/config.json` |
| Windows | `%USERPROFILE%\.lumen-x\config.json` |

打包应用时，需要设置环境变量 `LUMEN_X_PACKAGED=true` 来启用此模式。

#### 通过应用内设置

无论哪种模式，都可以通过应用内设置界面配置：
1. 进入项目页面
2. 点击左上角 🔑 图标
3. 填入配置信息并保存

### OSS 配置（推荐）

OSS 用于上传生成的图片/视频到云端，采用 **Private OSS + 动态签名 URL** 策略保障数据安全：

| 配置项 | 说明 | 示例/默认值 |
|-------|------|------------|
| OSS Bucket Name | Bucket 名称 | `my-comic-bucket` |
| OSS Endpoint | 地域节点 | `oss-cn-hangzhou.aliyuncs.com` |
| OSS Base Path | 存储路径前缀 | `lumenx` (默认) |

> **重要安全说明**:
> - Bucket 必须设置为 **Private（私有读写）**，严禁使用"公共读"
> - 系统存储 Object Key，返回 API 时自动生成 2 小时有效期的签名 URL
> - 传递给 AI 模型的参考图使用 30 分钟有效期的签名 URL

> **获取方式**: 访问 [阿里云 OSS 控制台](https://oss.console.aliyun.com/overview) 创建 Bucket

## 用户数据目录

所有用户相关数据（配置、日志）统一存储在用户主目录下：

| 操作系统 | 目录路径 |
|---------|----------|
| macOS/Linux | `~/.lumen-x/` |
| Windows | `%USERPROFILE%\.lumen-x\` |

目录结构：
```
~/.lumen-x/
├── config.json    # 配置文件（打包模式）
└── logs/
    └── app.log    # 应用日志
```

## 文件存储位置

所有生成的文件保存在 `output/` 目录下：

```
output/
├── assets/              # 角色、场景、道具图片
│   ├── characters/      # 角色立绘
│   ├── scenes/          # 场景图片
│   └── props/           # 道具图片
├── storyboard/          # 分镜渲染图
├── outputs/videos/      # 生成的视频片段
├── video/               # 合并后的最终视频
├── uploads/             # 用户上传的文件
└── video_inputs/        # 视频生成的输入图片快照
```

> **备份提示**: 定期备份 `output/` 目录和 `~/.lumen-x/` （用户数据）以防止数据丢失

## 日志与调试

### 查看后端日志

日志会实时输出到启动后端的终端窗口，包含：
- `[MERGE]` - 视频合并相关日志
- `[Storyboard]` - 分镜生成日志
- `INFO/WARNING/ERROR` - 通用日志级别

**开发模式查看日志：**
```bash
# 日志直接输出在终端
./start_backend.sh
```

**打包应用查看日志：**
- 日志存储在 `~/.lumen-x/logs/app.log`（详见[用户手册 - 日志查看](USER_MANUAL.md#-日志查看)）

### 常见错误排查

| 错误信息 | 可能原因 | 解决方案 |
|---------|---------|---------|
| `FFmpeg not found` | 未安装 FFmpeg | 参考上方安装说明 |
| `No videos selected to merge` | 未选择视频 | 确保每个分镜都选择了视频 |
| `OSS credentials not configured` | 未配置 OSS | 在设置中填写 OSS 信息 |
| `API Key not found` | 未配置 API Key | 在设置中填写 DashScope Key |

## 常见问题

## 许可证

[根据项目实际情况填写]

## 联系方式

[根据项目实际情况填写]
