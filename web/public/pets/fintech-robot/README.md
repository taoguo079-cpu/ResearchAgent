# Fintech Robot 原动画交接

已接入用户提供的 11 个透明 GIF，原文件位于 `C:\Users\54912\Desktop\gif\2.gif` 至 `12.gif`，按用户指定顺序映射到下表动作。项目内 `source` 保存原字节副本及 SHA-256，`manifest.json` 为校验通过后启用的独立动作资源清单。共 629 帧、63 秒导出动画，所有帧及时长保留；当前版本为 `builds/03d706534e61750a2d2e/`。

11.gif 实际为戴眼镜的放松造型，12.gif 为齿轮检修造型，按用户指定编号分别用于完成和失败状态。表内 Canva 名称是原计划的对应标签，不代表每个实际导出文件的目录名称均已核实。

来源索引中只有搜索素材的 Canva ID `VAFNUvfhgpg` 和目录原时长 5000 毫秒已通过插件核实；其他 ID 和目录原时长保持 `null`。它们以 `attributionStatus: user-supplied-export`、`originalFile`、独立校验值及完整文件 `exportDurationMs` 记录来源；不伪造素材 ID，也不将导出时长宣称为目录原周期。导出日期按本机原文件修改时间记录，未独立核实 Canva 时间戳。其余同系列动作尚未提供，没有新增业务状态。

在 Canva 为每个动作准备独立页面，每页只保留一个原始机器人，四周留足空间，完整保留道具和动画时长。不要给页面或文字额外添加动画。使用 **分享 → 下载 → GIF → 透明背景**，逐页下载完整片段。可以使用单独的导出设计，避免改动现有首页画布。参考 [Canva 官方导出说明](https://www.canva.com/help/download-as-video/)。

将文件放进本目录的 `source` 文件夹，建议按下表命名。背景必须透明，动画必须包含变化帧，机器人和道具不能碰到画布边缘。

| 状态        | 文件                   | Canva 素材名                                     |
| ----------- | ---------------------- | ------------------------------------------------ |
| idle        | source/idle.gif        | Fintech Robot Waving                             |
| orchestrate | source/orchestrate.gif | Fintech Robot Looking for a Location             |
| search      | source/search.gif      | Fintech Robot Doing Research                     |
| filter      | source/filter.gif      | Fintech Robot Marking Its Checklist              |
| read        | source/read.gif        | Fintech Robot Looking Through Its Phone Contacts |
| analyze     | source/analyze.gif     | Fintech Robot Thinking                           |
| synthesize  | source/synthesize.gif  | Fintech Robot Completing a Puzzle                |
| critic      | source/critic.gif      | Fintech Robot Giving a Rating                    |
| dragging    | source/dragging.gif    | Fintech Robot Flying                             |
| completed   | source/completed.gif   | Fintech Robot Raising Its Hands                  |
| failed      | source/failed.gif      | Fintech Robot with Error                         |

未来取得目录元数据后，可补充 `assetId`、`originalDurationMs` 及核实依据，再重新构建。`source-index.example.json` 仅为参考，未含完整的用户导出来源证明，不能直接用它启用资源。不要用下载文件名、缩略图网址或导出时长冒充 Canva ID／目录原周期。重新导入同样编号文件可运行 `node web/scripts/import-fintech-pet-exports.mjs 'C:/Users/54912/Desktop/gif'`；不同的旧源文件会先归档。

在 PowerShell 中可以用以下命令读取原文件校验值：

```powershell
Get-FileHash -Algorithm SHA256 -LiteralPath 'D:\agent\web\public\pets\fintech-robot\source\idle.gif'
```

将校验值转成小写后记录。`file` 可以使用其他原文件名，但必须是安全的 `source/<filename>.gif` 路径。原始文件保留不修改。

同系列额外动作放进 `source`，在 `assets` 数组中增加相同结构的条目。可留存地图困惑、欢迎、抛球、奔跑、锤子、放松、上网、困惑、命中目标、购物车、奖项等同系列动作。它们会被校验并记录在来源说明中，不新增业务状态。请勿加入其他画风的机器人或无关素材。

取得 11 个完整原动画及来源记录后，在项目根目录运行：

```powershell
npm --prefix web run pet:build
npm --prefix web run pet:validate
```

构建先核实所有原文件、映射、来源记录、独立校验值、透明背景、边缘和逐帧时长，再转换。已核实目录周期时将其与导出时长比较，最多允许 20 毫秒差异；仅有用户导出时则与记录的完整文件时长比较，不能据此证明 Canva 原周期完整。每个动作以整段动画的联合边界统一裁切和缩放，使用 192 × 208 单元格、每行 12 帧、至少 12 像素透明留白。不会逐帧移动裁切框，也不会减少帧数。静态图采用中间帧。完成动作在前端播放两轮，其他动作循环。

输出保存在不可变的 `builds/<校验版本>/` 下，包含各动作 WebP 精灵图、静态图、11 动作的浅色及深色预览总览、动画预览和 `SOURCES.md`。校验还会逐帧与原 GIF 转换结果比对。全部校验通过后才原子更新本目录的 `manifest.json`；失败不会切换项目资源。旧 `research-bot` 资源和原构建脚本继续保留，可通过 `pet:build:legacy`、`pet:validate:legacy` 使用。

需要恢复旧形象时，将本目录的 `manifest.json` 改名为一个未使用的备份文件名，再刷新页面。前端会读取保留的旧清单；新原动画及版本目录仍保留。仅运行旧构建命令不会停用新清单。

新原素材的 Canva 出处单独记录，旧 `research-bot` 原创来源说明不适用于这些新素材。
