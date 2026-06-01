[README(1).md](https://github.com/user-attachments/files/28469879/README.1.md)
<div align="center">

# ⚡ Nexel IDE

### A premium, minimal code editor built for competitive programmers and engineers who actually like their tools.

[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078d4?style=for-the-badge&logo=windows&logoColor=white)](#)
[![Built With: Electron](https://img.shields.io/badge/Electron-42-47848F?style=for-the-badge&logo=electron&logoColor=white)](#)
[![React 19](https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#)
[![Monaco Editor](https://img.shields.io/badge/Monaco-VS_Code_Engine-6f42c1?style=for-the-badge&logo=visualstudiocode&logoColor=white)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](#)

> A frameless, monochrome IDE. Monaco under the hood. A real terminal. A built-in CP judge.
> No bloat. No telemetry. Just code.

</div>

---

## ✨ What is Nexel IDE?

**Nexel IDE** is a desktop code editor that feels as good as it looks. It's built on the same
engine that powers VS Code (Monaco), wrapped in a hand-crafted, distraction-free UI, and ships
with a **local competitive-programming judge** so you can compile, run, and validate your
solutions against custom test cases — all without leaving the app.

It started as a personal project to scratch an itch: every editor out there is either too heavy
(VS Code, JetBrains), too limited (Sublime), or too "cloud" (the new wave of AI-first editors).
Nexel sits right in the middle — fast, native, beautiful, and laser-focused on the workflow
of someone who writes code for a living *or* for fun.

---

## 🎬 Highlights at a Glance

| Area | What you get |
|---|---|
| 🖥️ **Editor** | Monaco — the engine behind VS Code, with full IntelliSense, multi-cursor, and language services |
| 📁 **Workspace** | Recursive file tree, fuzzy search, pinned-shelf bookmarks, create/rename/delete ops |
| ⌨️ **Terminal** | Real shell (PowerShell / bash) via native `node-pty` — not a fake pseudo-terminal |
| 🏆 **Judge** | Local CP judge: compile C++/Java, run Python, AC/WA/TLE/MLE/RE verdicts, per-case metrics |
| 🎨 **UI** | Custom frameless window, floating glass dock, hover-reveal sidebar, monochrome aesthetic |
| 📦 **Distribution** | Packaged as a single Windows `.exe` installer (NSIS) with embedded custom icon |
| 🔌 **Extensibility** | React 19 + Vite + clean IPC bridge — easy to plug new panels into the dock |

---

## 🚀 Features

### 🧠 Editor Core
- **Monaco-powered** text editing with tabs, dirty markers, and unsaved-change protection
- **Multi-tab** workflow with "close all" / "close saved" quick actions
- **Auto-save** toggle and per-file content tracking
- **Boilerplate template** — set a snippet that auto-fills new files (great for competitive programming headers)
- **Cross-platform Monaco theming** that matches the rest of the IDE's monochrome look

### 📂 Workspace Explorer
- Recursive directory tree with smart ignore for `node_modules`, `.git`, `.vite`
- **Search belt** with regex / case toggles, live filtering
- **Pinned shelf** for files you hop between constantly
- Inline **create file**, **create folder**, **rename**, **delete**
- One-click "open folder" via the native OS picker

### ⌨️ Integrated Terminal
- Powered by **xterm.js** with a `node-pty` backend — a *real* terminal
- Falls back to a `child_process` shell if PTY native bindings fail
- Theme-matched to the editor background (`#0B0B0D`) for a seamless look
- Resize-aware, blur-friendly, undockable

### 🏆 Local Judge System
- **Multi-language support** out of the box:
  - `C++` — compiled with `g++ -O3 -std=c++17`
  - `Java` — compiled with `javac`, runs via `java -cp`
  - `Python` — runs via `python` (Windows) / `python3` (Unix)
  - Compiled binaries — runs directly
- **Per-test-case verdicts** with color-coded pills: `AC`, `WA`, `TLE`, `MLE`, `RE`
- **Metrics tracking** — execution time (ms) and peak memory (MB) per test case
- **Diff view** between expected vs. actual output
- **Isolated workspace per run** (`os.tmpdir()/nexel-judge/run_<id>`) — no leftover junk, no state leaks
- **Output size cap** (5 MB) so a runaway `while(true) print` doesn't fill your disk
- **Concurrent-safe** with per-run unique workspace IDs

### 🪟 Window & Shell
- **Frameless custom title bar** with File / Edit / View / Run / Help menus
- Window controls (minimize / maximize / close) routed through IPC
- **Floating glass NavDock** with hover-reveal collapse for maximum screen real estate
- **Sidebar collapse animations** powered by smooth `cubic-bezier` transitions
- High-DPI friendly, scales cleanly from 1080p to 4K

### 🛠️ Developer Experience
- **React 19 + TypeScript 6** with strict types
- **Vite** for instant HMR in dev
- **Hot-reloadable IPC** — change a handler in `main.cjs`, see it instantly
- **ESLint** with React Hooks + React Refresh presets
- **One-command packaging** — see [Building the Installer](#-building-the-installer)

---

## 🧱 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Shell** | Electron 42 | Mature, well-supported, custom window chrome without compromise |
| **UI Runtime** | React 19 | Modern, concurrent, fast |
| **Language** | TypeScript 6 | Strict typing across the IPC boundary |
| **Bundler** | Vite 8 | Lightning-fast HMR, tiny prod bundles |
| **Editor** | `@monaco-editor/react` | The same engine that powers VS Code |
| **Terminal** | `xterm.js` + `node-pty` | Authentic terminal experience |
| **Packaging** | `electron-builder` (NSIS) | Windows installer with custom branding |
| **Icon Patching** | `rcedit` + `png-to-ico` | Embed our logo into the final `.exe` |

### Architecture (the long-term plan)

The codebase is intentionally layered to stay **portable**:

```
┌─────────────────────────┐
│   UI Layer (React)      │  ← components, panels, theming
├─────────────────────────┤
│   App Logic (TS)        │  ← state, IPC contracts, judge orchestration
├─────────────────────────┤
│   Desktop Layer (Node)  │  ← Electron main, fs, pty, judge backend
└─────────────────────────┘
         ▲
   Easy swap to Tauri later by replacing the Desktop Layer
```

---

## 📦 Installation

### Option 1 — Use the Pre-built Installer (Windows)
Grab the latest `Nexel IDE Setup x.x.x.exe` from the [Releases](../../releases) page and run it.
The installer:
- Embeds the custom Nexel icon directly into the executable
- Creates a desktop shortcut + Start Menu entry
- Lets you pick the install directory
- Doesn't pester you with extra "offers"

### Option 2 — Run from Source

**Prerequisites**
- **Node.js** ≥ 20
- **npm** ≥ 10
- **Windows 10/11** (primary target), macOS/Linux will work but the installer is Windows-only
- *(Optional, for the Judge)* `g++`, `java`/`javac`, `python` on your `PATH`

**Clone & install**
```bash
git clone https://github.com/<your-org>/nexel-ide.git
cd nexel-ide/nexel-ide
npm install
```

**Launch the dev build (Vite + Electron with HMR)**
```bash
npm run electron:dev
```
This runs Vite on `localhost:5173`, waits for it to come up, then spawns Electron against it
with DevTools open. Save a file, see it reload — the good stuff.

**Run Vite alone (browser preview, no Electron APIs)**
```bash
npm run dev
```

---

## 🏗️ Building the Installer

To produce a real, distributable Windows installer:

```bash
# 1. Make sure the .ico is in place (regenerate from logo.png if needed)
node convert-icon.cjs

# 2. Run the full build pipeline (Vite → electron-builder → rcedit → NSIS)
node build-installer.cjs
```

When it finishes, you'll find:
```
dist-installer/
├── Nexel IDE Setup 1.0.0.exe          ← the user-facing installer
├── NexelIDE-win32-x64/                ← unpacked portable build
└── win-unpacked/                      ← raw build artifacts
```

The `build-installer.cjs` script does three things in sequence:
1. Builds the app package with `electron-builder`
2. **Embeds the custom `.ico`** into the resulting executable using `rcedit` (and patches product name, file description, copyright, etc.)
3. Rebuilds the NSIS installer pointing at the patched binary

> 💡 Code signing is intentionally disabled (`CSC_IDENTITY_AUTO_DISCOVERY: false`) to keep local builds friction-free. Flip it on in `package.json` before shipping a public release.

---

## 🗂️ Project Structure

```
nexel-ide/
├── build-installer.cjs        # End-to-end installer pipeline
├── convert-icon.cjs           # PNG → ICO conversion
├── main.cjs                   # Electron main process + IPC handlers
├── preload.cjs                # Safe contextBridge API for the renderer
├── public/                    # Static assets (favicon, icons)
├── src/
│   ├── App.tsx                # Root layout: TitleBar + dock + panels
│   ├── main.tsx               # React entry point
│   ├── components/
│   │   ├── TitleBar.tsx       # Frameless window chrome + menus
│   │   ├── NavDock.tsx        # Floating glass sidebar with collapse
│   │   ├── Explorer.tsx       # Workspace file tree + search + pins
│   │   ├── Editor.tsx         # Monaco-based multi-tab editor
│   │   ├── Terminal.tsx       # xterm.js + node-pty terminal
│   │   └── JudgeSystem.tsx    # CP test runner UI
│   ├── judge-backend/
│   │   └── judge-runner.cjs   # Local compile/run/verdict engine
│   └── assets/                # Logo + hero images
├── docs/
│   ├── architecture.md        # Tech stack and layering decisions
│   ├── features.md            # Feature notes
│   └── roadmap.md             # V1 / V2 plans
└── package.json
```

---

## 🧭 Roadmap

### ✅ V1 — Shipped
- [x] Workspace explorer with recursive scanning
- [x] Full file system operations (create / rename / delete)
- [x] Monaco-based editor with tabs
- [x] Integrated terminal with native PTY
- [x] Local judge system (C++ / Java / Python)
- [x] Per-test-case verdicts + metrics
- [x] Boilerplate template for new files
- [x] Custom NSIS installer with embedded icon

### 🚧 V2 — In Progress
- [ ] Competitive programming **snippet library** (segment tree, FFT, etc.)
- [ ] **Multi-workspace** support
- [ ] **Find in files** (ripgrep-style)
- [ ] **Git integration** panel
- [ ] **Extensions** / plugin sandbox

> Got an idea? Open an issue or drop it in Discussions. The roadmap is community-shaped.

---

## 🤝 Contributing

Nexel is a passion project and contributions are very welcome. The cleanest way in:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/awesome-thing`)
3. Make your changes, run `npm run lint` before committing
4. Open a Pull Request with a clear description of what & why

**Code style**
- TypeScript strict mode
- Follow the existing component structure (`.tsx` + co-located `.css`)
- Match the monochrome aesthetic — if you're adding a color, justify it
- IPC additions go in `preload.cjs` (expose) **and** `main.cjs` (handle)

**Reporting bugs**
Please include:
- OS + version
- Steps to reproduce
- Expected vs. actual behavior
- Screenshot or short clip if it's a visual issue

---

## 📜 License

Released under the **MIT License**. See [LICENSE](./LICENSE) for the full text.

```
MIT — do what you want, just don't sue us.
```

---

## 💜 Acknowledgements

Nexel IDE stands on the shoulders of giants:

- **[Monaco Editor](https://github.com/microsoft/monaco-editor)** — the same engine behind VS Code
- **[xterm.js](https://xtermjs.org/)** — terminal rendering that actually feels right
- **[node-pty](https://github.com/microsoft/node-pty)** — real PTY support in Node
- **[Electron](https://www.electronjs.org/)** — making native desktop apps approachable
- **[Vite](https://vitejs.dev/)** — the dev experience we all deserve
- **[rcedit](https://github.com/electron/rcedit)** — for painless Windows binary patching
- Everyone who's filed an issue, opened a PR, or said "this looks cool" — you matter

---

<div align="center">

**Built with caffeine and stubbornness by the Nexel Team** ☕⚡

If Nexel IDE made your day a little better, consider starring the repo. It helps more than you'd think.

</div>
