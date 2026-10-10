# 工坊星涟 · Atelier Click FX

[English](README.md) | 简体中文

[![CI](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml/badge.svg)](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml)
![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.0--rc.2-526aa8)
![License](https://img.shields.io/badge/license-MIT-c5a468)

<p align="center"><img src="icon.svg" width="88" alt="工坊星涟：深蓝底色上的金色星芒"></p>

适用于 **DeepSeek Harness Web GUI 和桌面端**的独立视觉插件。鼠标点击后，柔金细涟漪、瓷白四角星和少量长春花蓝微粒轻盈散开，在 **720 毫秒**内消散。

为「深海女仆工坊」的深蓝、柔金和蕾丝风格设计，直接读取当前皮肤配色，不附带第三方皮肤图片。遵循 [dsh-web-all 系列](https://github.com/zhu1090093659/dsh-web)使用的 DSH 原生包、profile patch 和浏览器模块规范；本插件是独立项目，并未收录到该全家桶。

## 安装

需要 **DSH 0.2.0-rc.2 或更新版本**，并且终端能运行 `dsh` 命令。桌面用户可通过应用的命令管理菜单注册命令。不需要另配模型、API 密钥、原生编译工具或插件依赖。

**桌面端**：先完全退出应用，再在 macOS 终端、Windows PowerShell 或 Linux Shell 中执行：

```sh
dsh plugin --profile desktop add "https://github.com/catisamaomao/dsh-atelier-clickfx/releases/download/v1.1.0/dsh-atelier-clickfx-1.1.0.tgz"
```

重新打开桌面应用，在「插件」中启用「工坊星涟」（名称随界面语言切换；包标识为 `dsh-atelier-clickfx`）。

**Web GUI**：

```sh
dsh plugin --profile web add "https://github.com/catisamaomao/dsh-atelier-clickfx/releases/download/v1.1.0/dsh-atelier-clickfx-1.1.0.tgz"
dsh web
```

若 Web 服务已在运行，需要重启。以上带引号的发布地址在 macOS、Windows PowerShell 和 Linux 中相同；使用自定义配置时，将 profile 名换成实际名称。

也可以从 [Releases](https://github.com/catisamaomao/dsh-atelier-clickfx/releases) 下载 `.tgz`，将绝对路径填入 DSH 插件安装器；或者安装指定标签源码：

```sh
dsh plugin --profile desktop add "github:catisamaomao/dsh-atelier-clickfx#v1.1.0"
```

仓库包含可直接加载的 JavaScript，安装不运行构建脚本。Release 同时提供安装包的 `SHA256SUMS.txt` 校验文件。本版本通过 GitHub 分发，尚未发布到 npm。

## 行为

- 鼠标或触控笔主键短按，产生一组范围约 90 CSS 像素的特效。
- 拖拽、长按、右键和触屏滚动不触发。
- 特效层不接收输入或抢占焦点；无音效、鼠标拖尾和空闲动画。
- 最多同时显示 8 组特效，密集点击会限流；Canvas 绘图缓冲区约限制为 800 万像素。
- 应用失焦、进入后台或窗口改变大小时，清空特效。
- 即时遵循系统「减少动态效果」设置：开启时不播放。
- 停用时移除 Canvas、撤销事件监听并取消动画帧。
- 不联网、不采集遥测、不调用模型、不访问存储、不持久化点击记录。

## 多语言

DSH 插件列表的名称和说明，以及独立预览页，支持 **English、简体中文、繁體中文、日本語、Русский**。DSH 元信息位于 `locale/*.json`，同时提供 `zh` 和 `zh-CN` 别名。动画本身不含文字，可用于任何界面语言。

应用内遵循宿主的语言解析规则；预览页提供语言选择，并默认识别浏览器语言。元信息以英文为回退。翻译显示文字时，请保留包名和模块注册 ID。

## 多操作系统与验证范围

| 平台 | 运行设计 | 验证范围 |
| --- | --- | --- |
| macOS | DSH 桌面端或 Web GUI | 已实测桌面端点击渲染、输入框焦点和页面切换 |
| Windows | 官方提供的 DSH 桌面端，或 Web GUI | Node 22/24 自动化 CI；未人工实测原生界面 |
| Linux | 官方提供的 DSH 桌面端，或 Web GUI | Node 22/24 自动化 CI；未人工实测原生界面 |

插件仅使用浏览器 Canvas 和 Pointer Events，没有系统专用命令、固定文件路径或原生模块。[CI 矩阵](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml)在三个系统上检查语法、安装包/语言文件完整性、宿主入口加载和生命周期。这些检查使用模拟 DOM/Canvas，不能代替原生界面实测。

## 皮肤配色

每次点击重新读取颜色，更换皮肤后无需重启特效：

| 用途 | 优先读取 | 回退值 |
| --- | --- | --- |
| 涟漪与暖色星芒 | `--maid-gold-soft`，其次 `--maid-gold` | `#e2cfaa` |
| 淡蓝断弧与微粒 | `--maid-periwinkle`，其次 `--dsw-alias-brand-primary` | `#8ea5da` |
| 中心星光 | `--maid-porcelain`，其次 `--dsw-alias-label-primary` | `#f8f6f0` |

没有女仆皮肤或 dsh-web-all 也可以运行。不修改这两个包、不新增设置面板、不切换所选皮肤。效果作用于应用渲染内容区，不覆盖系统标题栏、原生菜单或文件对话框。

## 开发与预览

```sh
git clone https://github.com/catisamaomao/dsh-atelier-clickfx.git
cd dsh-atelier-clickfx
npm run check
npm test
npm run pack:check
npm pack
```

无需安装依赖。在现代浏览器打开 `preview.html`，即可体验与 DSH **相同 `client.js`** 渲染的特效；预览也遵循减少动态效果设置。

`index.js` 是刻意保持空白的宿主入口；`client.js` 注册 DSH 懒加载浏览器模块，并通过 `ctx.effect` 管理特效生命周期。`cordis.patch.yml` 新增一个可单独开关的插件行，`package.json` 与 `locale/*` 导出公开元信息。

## 停用或卸载

在 DSH 插件页关闭「工坊星涟」。需要移除时，使用插件正常卸载入口，按宿主提示重启即可。本插件没有需要清理的数据目录。

## 许可证

[MIT](LICENSE)。仓库附带图形均为本插件原创；参考皮肤和 dsh-web-all 仍是各自作者的独立项目。
