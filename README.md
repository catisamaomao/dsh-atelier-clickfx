# Atelier Click FX · 工坊星涟

English | [简体中文](README.zh.md)

[![CI](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml/badge.svg)](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml)
![DSH](https://img.shields.io/badge/DSH-%3E%3D0.2.0--rc.2-526aa8)
![License](https://img.shields.io/badge/license-MIT-c5a468)

<p align="center"><img src="icon.svg" width="88" alt="Atelier Click FX: a gold star on a navy background"></p>

A small, independent visual plugin for **DeepSeek Harness Web GUI and Desktop**. Mouse clicks blossom into a fine gold ripple, porcelain-white four-point stars and a few periwinkle particles, then fade in **720 ms**.

Designed to complement the navy, gold and lace of **Maid Atelier / 深海女仆工坊**. It reads the active skin's colors and ships no third-party skin artwork. It uses the same native DSH package, profile-patch and browser-module conventions as the [dsh-web-all family](https://github.com/zhu1090093659/dsh-web), but is an independent plugin and is not bundled with that project.

## Install

Requires DSH **0.2.0-rc.2 or newer** with its `dsh` command available on PATH. Desktop users can register the command through the app's command-management menu. No separate model, API key, native build tools or plugin dependencies are needed.

**Desktop:** fully quit the application, then run the following in Terminal, PowerShell or your Linux shell:

```sh
dsh plugin --profile desktop add "https://github.com/catisamaomao/dsh-atelier-clickfx/releases/download/v1.1.0/dsh-atelier-clickfx-1.1.0.tgz"
```

Restart the desktop app. In **Plugins**, enable **Atelier Click FX** (its title follows your UI language; package ID: `dsh-atelier-clickfx`).

**Web GUI:**

```sh
dsh plugin --profile web add "https://github.com/catisamaomao/dsh-atelier-clickfx/releases/download/v1.1.0/dsh-atelier-clickfx-1.1.0.tgz"
dsh web
```

Restart an already running Web server. The quoted release URL works unchanged across macOS, Windows PowerShell and Linux. Use your actual profile name if you maintain a custom profile.

Alternatively, download the `.tgz` from [Releases](https://github.com/catisamaomao/dsh-atelier-clickfx/releases), add its absolute path in DSH's plugin installer, or install the tagged source:

```sh
dsh plugin --profile desktop add "github:catisamaomao/dsh-atelier-clickfx#v1.1.0"
```

The repository contains ready-to-load JavaScript; installing it does not run a build script. Releases include a `SHA256SUMS.txt` for the packaged artifact. This release is distributed through GitHub, not the npm registry.

## Behavior

- A short primary mouse or pen click creates one approximately 90 CSS-pixel burst.
- Drags, long presses, secondary buttons and touchscreen scrolling do not trigger it.
- The overlay never intercepts input or takes focus. No sound, cursor trail or idle animation.
- At most eight effects coexist; rapid clicks are rate-limited. The canvas backing buffer is capped at approximately eight million pixels.
- Effects clear when the app loses focus, becomes hidden or resizes.
- **Reduce Motion** is respected immediately: no effects play while that preference is enabled.
- Disabling the plugin disposes its canvas, event listeners and animation frame.
- No network calls, telemetry, model usage, storage access or persistent click history.

## Languages

The DSH plugin list title and description, plus the standalone preview, support **English, Simplified Chinese, Traditional Chinese, Japanese and Russian**. DSH metadata lives in `locale/*.json`, including `zh` and `zh-CN` aliases. The animation contains no text and works with any UI language.

The production plugin follows the host's locale resolution; the preview has its own language selector and browser-language default. English is the metadata fallback. Do not change the package ID or module registration ID when translating display text.

## Platforms and verification

| Platform | Runtime design | Validation |
| --- | --- | --- |
| macOS | DSH Desktop or Web GUI | Actual Desktop click rendering, input focus and navigation verified |
| Windows | DSH Desktop where available, or Web GUI | Node 22/24 automated CI; native UI not manually tested |
| Linux | DSH Desktop where available, or Web GUI | Node 22/24 automated CI; native UI not manually tested |

The plugin uses browser Canvas and Pointer Events and contains no OS-specific commands, filesystem paths or native modules. The [CI matrix](https://github.com/catisamaomao/dsh-atelier-clickfx/actions/workflows/ci.yml) checks JavaScript syntax, package/locale integrity, host loading and lifecycle behavior on all three operating systems. These checks use a simulated DOM/Canvas; they are not a substitute for native UI testing.

## Theme integration

Colors are sampled on each click, so a skin change does not require restarting the effect:

| Role | Preferred token | Fallback |
| --- | --- | --- |
| Ripple and warm stars | `--maid-gold-soft`, then `--maid-gold` | `#e2cfaa` |
| Blue arcs and particles | `--maid-periwinkle`, then `--dsw-alias-brand-primary` | `#8ea5da` |
| Central sparkle | `--maid-porcelain`, then `--dsw-alias-label-primary` | `#f8f6f0` |

The plugin remains usable without Maid Atelier or dsh-web-all. It does not edit either package, add settings panels or change the selected skin. It decorates the renderer's content area, not the operating system's title bar, menus or dialogs.

## Develop and preview

```sh
git clone https://github.com/catisamaomao/dsh-atelier-clickfx.git
cd dsh-atelier-clickfx
npm run check
npm test
npm run pack:check
npm pack
```

No dependency installation is required. Open `preview.html` in a modern browser for an interactive demo using the **same `client.js`** as DSH. The preview also respects Reduce Motion.

`index.js` is the deliberately empty host entry; `client.js` registers a lazy browser module with DSH and owns all effects through `ctx.effect`. `cordis.patch.yml` adds one independently toggleable row. Public package metadata is exported through `package.json` and `locale/*`.

## Disable or remove

Turn off **Atelier Click FX** in DSH's Plugins page. To remove it, use the plugin's normal uninstall action. Restart the host if prompted. There is no plugin data directory to clean up.

## License

[MIT](LICENSE). All artwork shipped in this repository is original to this plugin. The reference skin and dsh-web-all remain their authors' separate projects.
