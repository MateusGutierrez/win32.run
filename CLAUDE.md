# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

win32.run is a browser-based Windows XP emulator built with Svelte 3 + SvelteKit + Vite. Everything runs client-side — no server-side processing beyond serving static files. The virtual file system is persisted in IndexedDB via `idb-keyval`. The project is discontinued but functional.

## Build & Development Commands

```bash
npm run dev        # Dev server at http://localhost:3000
npm run build      # Production build → /build
npm run preview    # Preview production build
```

No test framework, linter, or formatter is configured.

## Architecture

**Routing & Boot Sequence:** `src/routes/index.svelte` is the entry point and manually handles dynamic page imports (Vite limitation). The flow is: boot screen → optional installation sequence → XP desktop.

**State Management:** `src/lib/store.js` contains Svelte writable stores for all shared state: running programs, file system handle (`hardDrive`), clipboard, z-index tracking, context menus, wallpaper, and selected items.

**Virtual File System:** `src/lib/fs.js` manages file/folder CRUD operations against IndexedDB. Each entry is an object with `id`, `name`, `type` (file/folder/drive/removable_storage), `children` (array of child IDs), `parent`, timestamps, and `icon`. `src/lib/finder.js` handles path resolution and navigation. `src/lib/system.js` defines the default file system structure and system configuration.

**Window Manager:** `src/lib/components/xp/Window.svelte` provides dragging, resizing, minimize/maximize, z-index layering, and position persistence via IndexedDB. The desktop orchestrator is `src/routes/xp/desktop.svelte`.

**Programs:** Each program lives in `src/routes/xp/programs/` as a Svelte component. Programs receive props: `id` (instance ID), `window` (window manager ref), `self` (for cleanup), and `exec_path` (for state restoration). There are 24+ programs including file explorer, notepad, paint, Internet Explorer, media player, Word, minesweeper, etc.

**UI Components:** Reusable XP-themed components in `src/lib/components/xp/` (Window, Dialog, Button, TitleBar, Menu, ContextMenu, Tab, CheckBox, etc.). Windows 95 and DOS variants exist in `src/lib/components/95/` and `src/lib/components/dos/`.

**SSR is disabled** in `src/hooks.js` — this is a fully client-side application.

## Key Constraints

- Svelte 3.44.0 and SvelteKit (next) versions are pinned — do not upgrade
- Dynamic imports in `index.svelte` are manual due to Vite not supporting variable dynamic imports
- All user data lives in browser IndexedDB; there is no backend database
- Deployment uses PM2 + NGINX reverse proxy on Vultr
