# ResearchAgent

本地优先的学术研究工作区：Next.js 页面 + FastAPI 持久任务 + Supervisor 动态研究图。支持中英文、SSE 回放、论文/证据联动、历史任务、DeepSeek 设置、明暗主题、宠物和报告追问。

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

网站首页是蓝色霓虹 3D 交互开场：进入后立即显示镂空 Research Agent 字体；一次点击屏幕让放大镜和科研机器人从顶部错时落下，双击静止的机器人后点击按钮进入研究工作区，也可随时点击“跳过开场”。每个标签页完成或跳过一次后会记住进度，再次访问首页直接进入工作区。研究工作区也可直接通过 `/workspace`（英文 `/en/workspace`）访问，DeepSeek key 配置在进入工作区后进行。

开场中的放大镜、机器人、镂空文字和屏幕边界共享 Rapier 物理场景，可相互碰撞、拖动和抛掷；文字受撞后轻晃并回到中央。缓慢把放大镜握柄放到机器人任一手掌附近松手即可手持，再次拖动可取下。拖动会隐藏引导，机器人静止后单击可恢复问候和研究按钮；系统减弱动画时保留拖动、手持，关闭掉落、惯性、弹跳和文字晃动。字体和物理运行资源本地打包；WebGL 不可用时保留静态标题和工作区入口。

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
npm --prefix web run i18n:check
npm --prefix web run build
npm --prefix web run pet:build
npm --prefix web run pet:validate
```

## 使用约束

- 每实例一个活跃研究，论文 3–15 篇，默认 15。
- 运行中可排队一个追问并替换/取消；报告完成自动回答。研究失败、取消、中断清空队列。
- 已完成追问使用现有报告与证据，不发起新的研究。回答失败保留问题可重试；服务重启可能重新调用未完成的模型请求，不重复提交消息对。
- SQLite 保存任务、事件、论文、文本块、证据和消息；Chroma 只是可选二级索引。
- 启动自动顺序执行数据库迁移，包括旧 sessions/messages 导入。升级前自行备份实际数据库。
- 单机可信使用，无账号和多进程任务接管。Demo 不得用于 production。


### 运行可靠性

真实研究使用单进程启动，不使用 `--reload` 或多个 workers。相同数据库的第二实例将被拒绝；开发重载必须使用独立 Demo 数据库。启动器日志位于 `logs/launcher-<id>/`，同时监控前后端，后端退出时返回失败。关闭启动器会请求后端正常关闭，活跃任务记为 interrupted；不会自动重启真实研究。
