# 轻量化前端交付包

个人仓库：`taoguo079-cpu/ResearchAgent`。发布分支：`轻量化前端`。基于 `前端重构`，包含完整 Next.js 前端重构及原有研究后端和 Windows 启动链。

## 包含内容

- 前端源码、英文／中文文案、组件与浏览器测试，保留路由、研究任务、追问、证据、论文、历史、设置、导出、执行回放、恢复与 SSE 协议。
- 黑／米白／红的瑞士风格视觉系统、12 栏网格、本地 Inter 和思源黑体 400／700 及 SIL 字体许可证；首页右侧说明为 20px（2026-10-09 用户选定 A + 20px）。
- [产品说明](../../PRODUCT.md)、[设计系统](../../DESIGN.md)、[页面规格](../../web/FRONTEND_DESIGN.md)与 [impeccable 设计记录](../../.impeccable/design.json)。
- 可移植的 [ResearchAgent-Conda.bat](../../ResearchAgent-Conda.bat) 与 [scripts/start_conda.ps1](../../scripts/start_conda.ps1)，以及它们调用的 [start_agent.ps1](../../scripts/start_agent.ps1)、[owned_process.py](../../scripts/owned_process.py)、[serve_backend.py](../../scripts/serve_backend.py)。
- [requirements.txt](../../requirements.txt)、[web/package-lock.json](../../web/package-lock.json)、[.env.example](../../.env.example)、离线 Demo 启动器及桌面验收截图。

本包使用源代码安装依赖，不包含 `.env`、API 密钥、本地数据库、日志、虚拟环境、`node_modules` 或编译缓存。

## Windows Conda 启动

安装 Anaconda／Miniconda 和 Node.js 后，在克隆目录双击 `ResearchAgent-Conda.bat`。默认创建或复用 `research-agent` 环境，新环境使用 Python 3.12；依赖缺失时安装，已有 `.env` 保留，缺失时从 `.env.example` 创建。

也可以在仓库根目录执行：

```powershell
.\ResearchAgent-Conda.bat
# 仅准备环境和依赖
.\ResearchAgent-Conda.bat -SetupOnly
# 更新已有安装的依赖
.\ResearchAgent-Conda.bat -InstallDependencies -SetupOnly
# 指定 Conda 安装路径
.\ResearchAgent-Conda.bat -CondaExe "D:\anaconda\Scripts\conda.exe"
```

浏览器默认打开 `http://localhost:3000`，API 使用 `http://127.0.0.1:8000`。首次使用在页面配置 DeepSeek API key。需要更改端口时，在启动前设置 `RESEARCH_WEB_PORT` 和 `RESEARCH_API_PORT`。启动器拒绝复用占用的端口，并仅管理自己创建的进程。

Conda 启动链与 `.venv` 启动链共用单进程后端和退出管理。关闭启动器时，运行中的研究被记为 interrupted，可在下次进入工作区恢复。快捷方式绑定生成目录；克隆到新位置时使用 `scripts/create_shortcut.ps1` 重新生成，或直接使用可移植的 `.bat`。

## 验收结果

前端完成验收于 2026-10-06，发布包整理于 2026-10-07。桌面基准为 **1366 × 768**；历史与设置的 full-page 截图可能高于视口。手机视觉对稿不在本轮范围内。

| 检查                                  | 结果                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 前端单元测试                          | 37 个文件、177 项通过；包含恢复通过的 6 项 SSE 测试                                                     |
| 浏览器业务场景                        | 原有 36 项通过，另新增并通过中文报告首屏场景                                                            |
| 修正后专项回归                        | 报告正文首屏、横排标签页、7／9／10／12 栏折叠、论文悬停对比度、回放滑块、追问、Zen／焦点、单一 SSE 通过 |
| TypeScript / ESLint / Prettier / i18n | 通过                                                                                                    |
| Next.js 生产构建                      | 通过                                                                                                    |
| Conda / Windows 启动链                | PowerShell 5 语法检查通过；启动器可靠性测试 2 项通过，验证异常退出、日志保留与自有端口释放              |
| 独立视觉复核                          | `ship`；报告几何、文字对比度、回放滑块配色三项问题已解决                                                |
| API 与数据结构                        | 未改动后端、API 合同、生成 schema 或数据库结构；业务 hooks／事件工具的改动仅为格式整理                  |

浏览器验证使用隔离离线 Demo，研究数据与结论是合成测试样例。旧深色主题和宠物偏好不改变界面；输入法、快捷提交、防重复提交、失败重试、任务恢复和研究偏好兼容性均保留。

## 截图索引

| 页面／状态     | 截图                                                                                                                                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 首页           | [英文](screenshots/welcome-waves-en.png) / [中文](screenshots/welcome-waves-zh-CN.png)                                                                                  |
| 功能菜单       | [英文](screenshots/menu-en.png) / [中文](screenshots/menu-zh-CN.png)                                                                                                    |
| 问题输入       | [英文](screenshots/question-en.png) / [中文](screenshots/question-zh-CN.png) / [初始研究页](screenshots/reference-research.png)                                         |
| 运行中研究     | [阶段进度](screenshots/task-live.png)                                                                                                                                   |
| 报告           | [英文](screenshots/report.png) / [中文](screenshots/report-zh.png)                                                                                                      |
| 导航／证据折叠 | [9 栏正文](screenshots/report-navigation-collapsed.png) / [10 栏正文](screenshots/report-evidence-collapsed.png) / [12 栏正文](screenshots/report-panels-collapsed.png) |
| 证据与论文     | [证据选中](screenshots/evidence-selected.png) / [论文](screenshots/papers.png) / [论文悬停](screenshots/papers-hover.png)                                               |
| 运行与回放     | [运行详情](screenshots/run-details.png) / [回放展开](screenshots/replay-expanded.png) / [事件检查](screenshots/replay-inspector.png)                                    |
| 历史           | [英文](screenshots/history.png) / [中文](screenshots/history-zh.png)                                                                                                    |
| 设置           | [英文](screenshots/settings.png) / [中文](screenshots/settings-zh.png)                                                                                                  |
| 错误页         | [任务不存在](screenshots/not-found.png)                                                                                                                                 |

## 复现检查

2026-10-09 字体调整：用户选定 **A（思源黑体）+ 首页右侧 20px**。中文全站使用本地 WOFF2 常规／粗体，英文继续使用 Inter。转换前后的 30,926 个字符映射、字形指令及排版表一致；保留上游 SIL 许可证。复核了 1366 × 768 中英文首页和中文问题输入页，无横向溢出。首页 8 项测试、typecheck、lint、format:check 和生产构建通过。

更新后的首页截图：[中文 A + 20px](screenshots/welcome-zh-A20.jpg)／[英文 20px](screenshots/welcome-en-A20.jpg)。上方 2026-10-06 的截图保留为原始验收记录。

2026-10-10 波纹优化：首页保持原排版，使用 Canvas 2D 和原生 rAF，每帧按 8 条线一批完整绘制，不设置帧率上限。时间归一化的黑点和弹性、真实 Chrome 全屏测量、验证与最新中英文截图见 [首页波纹记录](home-waves.md)；上方首页索引指向本次版本，其余旧截图保留为历史记录。

```powershell
conda activate research-agent
python -m pytest backend/tests/test_launcher_reliability.py -q
npm --prefix web run test -- --run
npm --prefix web run typecheck
npm --prefix web run lint
npm --prefix web run format:check
npm --prefix web run i18n:check
npm --prefix web run build
# Playwright 自动创建隔离 Demo；先确认 3000 / 8000 端口可用。
$env:PYTHON_EXE = (Get-Command python.exe).Source
npm --prefix web run test:e2e
```
