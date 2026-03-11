# Design: Integrate Build Scripts into oceancode CLI

## Overview

Rewrite the 8 shell/batch build and launcher scripts as two new `oceancode` command groups (`build` and `launch`), backed by a `build.yaml` config at the workspace root. A single Node.js implementation replaces all platform-specific scripts, using `child_process` for tool invocation and `process.platform` for OS-specific behavior (venv paths, binary extensions, package managers).

## Goals

- **`oceancode build`** command group with actions: `all`, `backends`, `frontends`, `cli` — plus granular targeting (e.g., `oceancode build backends oceanquant`)
- **`oceancode launch`** command group with dev/prod modes: `oceancode launch oceanwave` (dev) vs `oceancode launch oceanwave --prod`
- **`build.yaml`** at workspace root — defines PyPI deps, local package install order, frontend build targets, CLI build targets, launcher configs
- **Cross-platform** — single Node.js codebase handles Linux, macOS, and Windows (tool installation via curl/brew/winget with user confirmation)
- **Pre-flight checks** — detect missing tools, prompt user before auto-installing
- **Delete legacy files** — remove `build/*.sh`, `build/*.bat`, `launchers/*.sh`, `launchers/*.bat`, and the now-empty directories

## Non-Goals

- No CI/CD integration — this is a local developer tool, not a build pipeline
- No Docker/container builds — builds run directly on the host OS
- No pre-built wheel fallback for oceanquant_rust — maturin only, fail if Rust is missing
- No Electron packaging — `oceancode build frontends` builds dev assets (npm install + build), not a distributable .exe/.app
- No parallel builds — build steps run sequentially in defined order (dependency ordering matters for backends)

## Design

### Command Interface

```
oceancode build [target] [package] [flags]
  targets: all (default), backends, frontends, cli
  package: optional granular target (e.g., oceanquant, oceanreact)
  flags:   --config <path>   (default: ../build.yaml relative to workspace root)
           --skip-preflight  (skip tool checks)

oceancode launch <app> [flags]
  apps:    oceanwave, oceandata
  flags:   --prod   (run compiled/packaged version instead of dev)
```

### build.yaml Structure

All platform-specific values use a consistent three-key scheme: `linux`, `macos`, `windows`. On macOS, venvs use the same `venv-linux` directory name (shared Unix layout); this is explicit in the config rather than a hidden fallback.

```yaml
python_version: "3.12"

venv:
  oceanwave_dash:
    path: lib/front_ends/oceanwave_dash
    dir:
      linux: venv-linux
      macos: venv-linux
      windows: venv-windows
  oceandata_gui:
    path: lib/front_ends/oceandata_gui
    dir:
      linux: venv-linux
      macos: venv-linux
      windows: venv-windows

pypi_deps:
  - loguru
  - base36
  - scipy
  - matplotlib
  - plotly
  - bokeh
  - numba
  - pandas
  - numpy
  - toml
  - fastapi
  - uvicorn
  - pydantic
  - httpx
  - pytest
  - pytest-asyncio
  - requests
  - pyyaml
  - python-dateutil
  - gitpython
  - gita
  - pandas-ta==0.4.71b0

local_packages:
  - name: jsonldb
    path: lib/jsonldb
  - name: oceancap
    path: lib/oceancap
  - name: oceanutil
    path: lib/oceanutil
  - name: oceandata
    path: lib/oceandata
  - name: oceanseed
    path: lib/oceanseed
  - name: oceanquant
    path: lib/oceanquant
    rust_extension:
      path: lib/oceanquant/oceanquant/rust
  - name: oceanfarm
    path: lib/oceanfarm
  - name: oceanseed_app
    path: lib/back_ends/oceanseed_app
    extras: "[server]"
  - name: oceanfarm_app
    path: lib/back_ends/oceanfarm_app
  - name: oceanhub_app
    path: lib/back_ends/oceanhub_app
    build_script: launch_scripts/{platform}/build_venv
  - name: oceandata_gui
    path: lib/front_ends/oceandata_gui
    build_script: scripts/setup_env

frontends:
  - name: oceanreact
    path: lib/front_ends/oceanreact
    verify: dist
  - name: oceanwave_dash
    path: lib/front_ends/oceanwave_dash
    steps:
      - npm install
      - npm run install:frontend
      - npm run install:oceanreact-local
      - npm run build:frontend
    verify: frontend/dist

cli_tools:
  - name: oceandata
    path: lib/cli/oceandata-cli
    type: go
  - name: oceanlab
    path: lib/cli/oceanlab-cli
    type: bun
    entry: src/cli.ts

launchers:
  oceanwave:
    dev:
      cwd: lib/front_ends/oceanwave_dash
      cmd: npm run dev
    prod:
      binary:
        linux: bin/linux/oceanwave
        macos: bin/macos/oceanwave
        windows: bin/win/oceanwave.exe
  oceandata:
    dev:
      venv_path: lib/front_ends/oceandata_gui
      entry: oceandata_gui/main.py
    prod:
      binary:
        linux: bin/linux/oceandata
        macos: bin/macos/oceandata
        windows: bin/win/oceandata.exe

preflight_tools:
  backends: [uv]
  frontends: [node, npm]
  cli: [go, bun]

tool_install:
  uv:
    url: "https://docs.astral.sh/uv/"
    auto:
      linux: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      macos: "curl -LsSf https://astral.sh/uv/install.sh | sh"
      windows: "winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements"
  node:
    url: "https://nodejs.org/"
    auto:
      macos: "brew install node"
      windows: "winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements"
  go:
    url: "https://go.dev/"
    auto:
      macos: "brew install go"
      windows: "winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements"
  bun:
    url: "https://bun.sh/"
    auto:
      linux: "curl -fsSL https://bun.sh/install | bash"
      macos: "curl -fsSL https://bun.sh/install | bash"
      windows: "winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements"
  cargo:
    url: "https://rustup.rs/"
    auto:
      linux: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
      macos: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
      windows: "winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements"
```

**Tool install behavior:** Each tool entry has a `url` (always shown) and optional `auto` commands per platform. If `auto` exists for the current platform and doesn't require `sudo`, preflight prompts the user: "Install <tool>? [y/N]". If no `auto` command exists (e.g., `node` on Linux), preflight prints: "ERROR: <tool> not found. Install from <url>" and exits. No `sudo` commands are ever run automatically. If the user declines auto-install, the same manual instructions are shown.

### Module Structure

```
src/commands/build.js    — parse args, load build.yaml, dispatch to builders
src/commands/launch.js   — parse args, load build.yaml, run app
src/lib/build/
  preflight.js           — tool detection, user-prompted install
  backends.js            — venv creation, PyPI deps, local packages, Rust extension
  frontends.js           — npm install + build for each frontend target
  cli.js                 — Go build + Bun compile for CLI tools
  platform.js            — OS detection helpers (platform, venv paths, bin extensions)
```

### Platform Handling

`platform.js` exports helpers based on `process.platform`:
- `getPlatform()` → `'linux' | 'macos' | 'windows'`
- `getVenvBin(venvPath)` → `venvPath/bin/python` or `venvPath\Scripts\python.exe`
- `getBinDir()` → `bin/linux`, `bin/macos`, or `bin/win`
- `getShellCmd(cmd)` → wraps in `sh -c` or `cmd /c` as needed
- `getScriptExt()` → `'.sh'` or `'.bat'`

### Build Flow

**Backends:**
1. Preflight: check `uv`, `cargo` — prompt to install if missing
2. Create primary venv: `uv venv <path> --python 3.12`
3. Install PyPI deps: `uv pip install --python <bin> <deps...>`
4. Install local packages in order from config: `uv pip install --python <bin> -e <path>[extras]`
5. For packages with `rust_extension`: install maturin, run `maturin develop --release` in extension dir
6. For packages with `build_script`: run the platform-appropriate script (replace `{platform}` with `linux`/`win`/`macos`)
7. Verify: attempt `<python_bin> -c "import <name>"` for each package

**Granular backend targeting:** When a specific package is requested (e.g., `oceancode build backends oceanquant`), the venv and PyPI deps are assumed to already exist. Only the targeted package (and its `rust_extension`/`build_script` if any) is re-installed. If the venv doesn't exist, the command fails with a clear message: "Venv not found — run `oceancode build backends` first to create the full environment." This avoids partial dependency chains and keeps granular builds fast.

**Frontends:**
1. Preflight: check `node`, `npm`
2. For each frontend in config:
   - If `steps` defined: run each step as shell command in the frontend's directory
   - Otherwise: run `npm install` + `npm run build`
   - Verify: check `verify` directory exists
3. Granular: if package specified, only build that one frontend

**CLI tools:**
1. Preflight: check `go`, `bun`
2. For each CLI tool in config, build for the **current host platform only** (no cross-compilation):
   - `go` type: `go mod download` + `go build -o <bindir>/<name>[.exe] .` (uses host GOOS/GOARCH by default)
   - `bun` type: `bun install` + `bun build <entry> --compile --outfile <bindir>/<name>[.exe]` (compiles for host by default)
3. Platform mapping for output paths:
   - Linux: `bin/linux/<name>`, no `.exe`
   - macOS: `bin/macos/<name>`, no `.exe`
   - Windows: `bin/win/<name>.exe`
4. Verify: check binary exists in bin dir

**No cross-compilation:** Builds always target the current host. Building Windows binaries requires running on Windows; building Linux binaries requires running on Linux. This avoids cross-compilation complexity with Bun (which doesn't reliably cross-compile) and keeps Go builds simple.

**Launch:**
1. Load launcher config from build.yaml
2. If `--prod`: run the platform-appropriate binary directly via `spawn` with `stdio: 'inherit'`
3. If dev mode:
   - If `venv_path` + `entry`: resolve the venv Python binary using `getVenvBin()` (e.g., `venv-linux/bin/python`), then `spawn(pythonBin, [entry], { cwd, stdio: 'inherit' })` — no shell activation needed, the venv Python binary includes the correct `sys.prefix`
   - If `cwd` + `cmd`: `spawn` the command in the target directory with `stdio: 'inherit'`
4. All launches use `spawn` with `stdio: 'inherit'` so the launched app takes over the terminal

### Key Decisions

| Decision | Reasoning |
|----------|-----------|
| Single `build.yaml` for all targets | One file to maintain, easy to see full picture |
| No wheel fallback for Rust | User decided: maturin only, fail clearly if Rust missing |
| User confirmation before tool install | Avoids surprise `sudo` or package manager invocations |
| No `sudo` in auto-install commands | Linux auto-install only uses user-space installers (curl-based). Tools requiring `sudo` (node, go on Linux) show manual instructions only |
| Native builds only, no cross-compilation | Avoids Bun cross-compile issues and Go CGO complications |
| Venv Python binary invoked directly | No shell activation needed — `spawn(pythonBin, ...)` is portable and deterministic |
| Sequential builds, no parallelism | Backend packages have dependency ordering; simpler to reason about |
| `spawn` with `stdio: 'inherit'` for launchers | App needs terminal control (stdin, colors, etc.) |

### Error Handling

**Pre-flight decline/failure:** If user declines auto-install or no auto command exists, print the tool's `url` to stderr and exit with code 1. The build does not continue without required tools. User re-runs `oceancode build` after manual installation.

**Rust extension:** Preflight checks for `cargo` only when at least one `local_packages` entry has a `rust_extension` field. If missing, the build fails at preflight (before venv creation) with: "ERROR: cargo not found — required for oceanquant Rust extension. Install from https://rustup.rs/".

**Local package install order:** The config array order IS the install order. No automatic dependency resolution — the user is responsible for correct ordering in `build.yaml`. If a package fails to install, the build stops immediately with the `uv pip install` error output.

**Granular backend rebuild:** Only re-runs `uv pip install -e` for the targeted package. Does not check whether PyPI deps have changed. If the venv is stale or corrupted, user runs `oceancode build backends` (full) to recreate it.

**Frontend verification:** The `verify` path is relative to the frontend's own directory (e.g., `frontend/dist` means `<workspace>/<frontend.path>/frontend/dist`). Checks directory exists AND contains at least one file.

**Launch errors:** Before spawning, checks that the binary (prod) or venv Python binary + entry file (dev) exist. If missing, prints: "ERROR: <path> not found — run `oceancode build <target>` first" and exits with code 1.

**Backend verification:** Import checks run using the venv Python binary (`<venvBin> -c "import <name>"`), not host Python. For packages with `rust_extension`, also verifies `import <extension_module>`.

**Config validation:** On load, checks that all `path` values in `local_packages`, `frontends`, `cli_tools`, and `launchers` reference directories that exist relative to workspace root. Missing paths produce a warning but don't block the build (the directory may be created during build).

## Success Criteria

- `oceancode build` runs full build (backends → frontends → cli) on Linux, macOS, and Windows
- `oceancode build backends oceanquant` rebuilds only oceanquant (and its Rust extension)
- `oceancode build frontends oceanreact` rebuilds only oceanreact
- `oceancode build cli oceandata` rebuilds only oceandata-cli
- `oceancode launch oceanwave` starts dev mode, `oceancode launch oceanwave --prod` runs compiled binary
- `oceancode launch oceandata` starts dev mode with venv activation, `--prod` runs compiled binary
- Missing tools trigger a prompt — user confirms before auto-install proceeds
- `build.yaml` at workspace root is the single source of truth for all build config
- All 8 shell/batch files in `build/` and `launchers/` are deleted
- All tests pass (`node --test test/`)
- Verification step at end of each build target confirms success

## Testing Approach

- Unit tests for `platform.js` (OS detection, path helpers), `preflight.js` (tool detection logic), and build.yaml config loading
- Integration tests for build command arg parsing and config resolution
- Integration tests for launch command arg parsing and config resolution
- Manual verification on the actual workspace: run `oceancode build` end-to-end, confirm all verification checks pass
