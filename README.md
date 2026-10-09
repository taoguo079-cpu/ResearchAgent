# ResearchAgent

本地优先的学术研究工作区：Next.js 页面 + FastAPI 持久任务 + Supervisor 动态研究图。支持中英文、SSE 回放、论文/证据联动、历史任务、DeepSeek 设置、固定米白主题和报告追问。

本版本发布于 `轻量化前端` 分支。完整源码包含 Conda / `.venv` 启动器、本地 Inter 字体与许可证、中英文文案、测试和设计记录；[交付清单、截图与验收结果](docs/frontend-swiss/README.md)可直接在仓库查看。克隆该版本：

```powershell
git clone --branch 轻量化前端 https://github.com/taoguo079-cpu/ResearchAgent.git
cd ResearchAgent
```

## 启动

安装 Python 3.11 或更新版本（推荐 3.12，安装时启用 Python Launcher 或加入 PATH）和 Node.js 20.9 或更新版本后，双击仓库根目录的 `ResearchAgent-启动.bat`。

首次启动会自动创建 `.venv`、安装 `requirements.txt` 和前端依赖，并在 `.env` 不存在时从 `.env.example` 创建；准备成功后自动启动服务。首次安装需要联网，安装进度显示在启动窗口中。

后续启动会跳过已完成的安装；Python 或前端依赖清单内容变化时自动重新安装对应依赖，删除 `.venv` 或 `web/node_modules` 后也会重新准备。安装失败会停止启动，解决网络等问题后再次双击即可重试。已有 `.env` 不会被覆盖。

也可以在本仓库根目录通过 PowerShell 准备并启动：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/prepare_agent.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_agent.ps1
```

浏览器打开 http://localhost:3000 。首次使用会要求配置 DeepSeek key；默认模型和轻量模型均为 deepseek-flash。DashScope 嵌入可选。请勿同时使用其他目录已启动的 3000/8000 服务。

前端采用瑞士国际主义风格：黑色、米白和强调红，12 栏网格、左对齐文字及本地 Inter 常规/粗体。首页通过 NEXT 进入功能菜单，菜单可打开新研究、历史和设置；问题输入页保留研究示例、高级参数、中文输入法与 Ctrl/Cmd + Enter 提交。每个标签页进入一次后会跳过首页，直接显示菜单。

研究工作区保留任务导航、正文与证据面板、编号阶段进度、报告追问、论文/引用联动、执行回放和 Zen 模式。旧深色主题和宠物偏好不会改变界面；机器人、开场动画与悬浮宠物不再加载。桌面设计验收基准为 1366 × 768。

启动脚本拒绝复用已占用的端口；与旧工作区并行运行时，先设置 `$env:RESEARCH_WEB_PORT = '3100'` 和 `$env:RESEARCH_API_PORT = '8100'`，浏览器改用 http://localhost:3100 。

手动启动：

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
# 另一终端
npm --prefix web run dev
```

可选旧客户端：`streamlit run frontend/streamlit_app.py`，与新页面使用同一后端和任务数据库。

## Conda 环境启动（Windows）

安装 Anaconda/Miniconda 和 Node.js 后，双击 `ResearchAgent-Conda.bat`。脚本默认使用 `research-agent` 环境；环境不存在时自动创建 Python 3.12 环境，首次使用时安装 `requirements.txt`，前端依赖缺失时执行 `npm ci`，并在 `.env` 不存在时从示例创建。首次准备需要联网。

后续启动会复用环境；`requirements.txt` 内容变化时自动重新安装 Python 依赖。原来的 `.venv` 启动入口仍可使用。Conda 启动器会激活所选环境并设置 `PYTHON_EXE`，无需执行 `conda init`。

也可以在仓库根目录通过 PowerShell 指定环境或 Conda 安装位置：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_conda.ps1 -EnvironmentName research-agent -CondaExe "D:\anaconda\Scripts\conda.exe"
```

可选参数：

- `-EnvironmentName 名称`：选择独立 Conda 环境（默认 `research-agent`，不允许使用 `base`/`root`）。已有环境需包含 Python 3.11 或更新版本，建议与当前项目环境一致使用 3.12。
- `-CondaExe 路径`：自动发现 Conda 失败时，指定 `conda.exe` 的完整路径。
- `-InstallDependencies`：重新执行 Python 依赖安装和 `npm ci`；更新前端依赖后也可使用此参数。
- `-SetupOnly`：仅准备环境和依赖，不启动服务。
- `-NoBrowser`：启动服务但不自动打开浏览器。

这些参数也可以传给 `ResearchAgent-Conda.bat`。启动端口仍通过 `RESEARCH_API_PORT` / `RESEARCH_WEB_PORT` 配置。

## Windows 启动快捷方式

仓库根目录包含 `ResearchAgent-新版.lnk`，与 `ResearchAgent-启动.bat` 配套。快捷方式会记录生成时的目录；克隆到其他位置后，请先在新仓库根目录执行以下命令，使它指向当前目录：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create_shortcut.ps1
```

随后双击 `ResearchAgent-新版.lnk` 启动。需要放到桌面时，可将重新生成的快捷方式复制过去；它的目标、工作目录和图标都取自当前仓库。

## 离线演示与验收

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_dev.ps1
```

自动 Playwright 会启动独立 Demo 数据库，不使用真实模型或论文源。若原工作区仍运行，可使用隔离端口：

```powershell
$env:E2E_WEB_PORT = '3100'
$env:E2E_API_PORT = '8100'
$env:E2E_DEMO_DELAY_SECONDS = '1'
npm --prefix web run test:e2e
```

已有可用 Python 时，可设置 `$env:PYTHON_EXE = '完整的 python.exe 路径'`，供启动/OpenAPI 脚本使用，不必复制虚拟环境。

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
.\.venv\Scripts\python.exe -m compileall -q backend
npm --prefix web run api:export
npm --prefix web run api:generate
npm --prefix web run api:check
npm --prefix web run test -- --run
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run format:check
npm --prefix web run i18n:check
npm --prefix web run build
```

旧机器人和宠物素材工具保留为历史实现，不属于当前前端启动或验收流程。当前设计规范见 [DESIGN.md](DESIGN.md)，页面规格见 [web/FRONTEND_DESIGN.md](web/FRONTEND_DESIGN.md)。

## 使用约束

- 每实例一个活跃研究，论文 3–15 篇，默认 15。
- 运行中可排队一个追问并替换/取消；报告完成自动回答。研究失败、取消、中断清空队列。
- 已完成追问使用现有报告与证据，不发起新的研究。回答失败保留问题可重试；服务重启可能重新调用未完成的模型请求，不重复提交消息对。
- SQLite 保存任务、事件、论文、文本块、证据和消息；Chroma 只是可选二级索引。
- 启动自动顺序执行数据库迁移，包括旧 sessions/messages 导入。升级前自行备份实际数据库。
- 单机可信使用，无账号和多进程任务接管。Demo 不得用于 production。

### 运行可靠性

真实研究使用单进程启动，不使用 `--reload` 或多个 workers。相同数据库的第二实例将被拒绝；开发重载必须使用独立 Demo 数据库。启动器日志位于 `logs/launcher-<id>/`，同时监控前后端，后端退出时返回失败。关闭启动器会请求后端正常关闭，活跃任务记为 interrupted；不会自动重启真实研究。
