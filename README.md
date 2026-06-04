<div align="center">

<img src="logo.png" alt="Nexel IDE Logo" width="96" />

# ⚡ Nexel IDE

### A premium, minimal code editor built for competitive programmers and engineers.

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

## 🎬 Interactive Demonstration

See Nexel IDE, autocomplete, and the gamified CP judge in action:

![Demo Video](recording.gif)

---

## ✨ What is Nexel IDE?

**Nexel IDE** is a desktop code editor that feels as good as it looks. It is powered by the Monaco Editor engine (the same engine that drives VS Code), wrapped in a hand-crafted, distraction-free UI, and integrates a **local competitive-programming judge** so you can compile, run, and validate your solutions against custom test cases — all without leaving the app.

---

## 🎬 Highlights at a Glance

| Area | What you get |
|---|---|
| 🖥️ **Editor** | Monaco engine with full IntelliSense, multi-cursor support, and language services |
| 📂 **Workspace** | Recursive file tree, fuzzy search, pinned-shelf bookmarks, and inline file/folder creation |
| ⌨️ **Terminal** | Real shell (PowerShell / bash) via native `node-pty` bindings |
| 🏆 **Judge** | Local CP judge: C++/Java/Python execution, AC/WA/TLE/MLE/RE verdicts, and metrics tracking |
| 🎨 **UI** | Custom frameless window, floating glass dock, hover-reveal sidebar, and monochrome aesthetics |
| 🔌 **Extensibility** | React 19 + Vite + clean IPC bridge — easily expandable |

---

## 🚀 Features

### 🧠 Editor Core & Templates
- **Monaco-powered** text editing with tabs, dirty markers, and unsaved-change protection
- **Multi-tab** workflow with "close all" / "close saved" quick actions
- **Boilerplate template** — set a custom snippet that auto-fills new `.cpp` files upon creation
- **Cross-platform Monaco theming** matching the IDE's signature monochrome look
- **Auto-save** toggle and per-file content tracking

### 📂 Workspace Explorer
- Recursive directory tree with smart ignore for heavy folders (`node_modules`, `.git`, `.vite`)
- **Search belt** with regex / case-sensitivity toggles and live filtering
- **Pinned shelf** for rapid hopping between favorite files
- Inline **create file**, **create folder**, **rename**, and **delete** options
- One-click "open folder" via the native OS directory picker

### ⌨️ Integrated Terminal
- Powered by **xterm.js** with a `node-pty` backend — an authentic terminal shell
- Falls back to a standard `child_process` shell if PTY native bindings are unavailable
- Theme-matched background (`#0B0B0D`) for a seamless visual flow

### 🏆 Local Judge System
- **Multi-language support** out of the box:
  - `C++` — compiled dynamically with `g++ -std=c++17` (near-instant compilation without heavy optimizations)
  - `Java` — compiled with `javac`, runs via `java -cp`
  - `Python` — runs via `python` (Windows) / `python3` (Unix)
- **Per-test-case verdicts** with color-coded pills: `AC`, `WA`, `TLE`, `MLE`, `RE`
- **Metrics tracking** — execution time (ms) and peak memory (MB) per test case
- **Diff view** side-by-side comparison between expected and actual output
- **Gamified feedback animations**:
  - 🎉 **Accepted (AC)**: Triggers a soft neon green glow wash across the active editor tab, editor canvas, and judge panel for 1.5 seconds.
  - ⚠️ **Wrong Answer (WA)**: Shakes the metrics panel horizontally with a crisp motion to alert you.

### 🪟 Window & Aesthetics
- **Frameless custom title bar** with File / Edit / View / Run / Help menus
- Window controls (minimize / maximize / close) routed through Electron IPC
- **Floating glass NavDock** with hover-reveal collapse for maximum screen real estate
- Custom four-spiked **Shuriken icon** on the NavDock that glows and spins smoothly on hover

---

## 🧱 Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Shell** | Electron 42 | Mature, custom window chrome, and full desktop OS capabilities |
| **UI Runtime** | React 19 | Modern, concurrent, and fast rendering |
| **Language** | TypeScript 6 | Strict type safety across the Electron IPC boundary |
| **Bundler** | Vite 8 | Lightning-fast HMR and tiny production bundles |
| **Editor** | `@monaco-editor/react` | The industrial-grade VS Code editor engine |
| **Terminal** | `xterm.js` + `node-pty` | Authentic terminal shell integration |

---

## 📦 Run from Source

**Prerequisites**
- **Node.js** ≥ 20
- **npm** ≥ 10
- **Windows 10/11**
- *(Optional, for the Judge)* `g++', `java`/`javac`, `python` on your `PATH`

**Clone & Install**
```bash
git clone https://github.com/naman/nexel-ide.git
cd nexel-ide/nexel-ide
npm install
```

**Launch the dev build (Vite + Electron with HMR)**
```bash
npm run dev
```

---

## 🗂️ Project Structure

```
nexel-ide/
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
└── package.json
```

---

## 🧭 Roadmap

### ✅ V1 — Shipped
- [x] Workspace explorer with recursive scanning and file operations
- [x] Monaco-based editor with auto-save and tab state management
- [x] Integrated terminal with native PTY support
- [x] Local judge system (C++ / Java / Python) with AC/WA gamified animations
- [x] Telemetry tracking (execution speed and memory overhead)
- [x] C++ boilerplate template injection

### 🚧 V2 — In Progress
- [ ] Pinned snippet collection panel (Segment Trees, Graphs, Math templates)
- [ ] Finder overlay (Project-wide search/replace)
- [ ] Git integration view

---

## 📜 License

Released under the **MIT License**. See [LICENSE](./LICENSE) for the full text.

```
MIT — do what you want, just don't sue us.
```

---

<div align="center">

**Built with caffeine and stubborness by the Nexel Team** ☕⚡

</div>
