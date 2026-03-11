## Round 1

- [F1.1] Added "Granular backend targeting" section to Build Flow. When a specific package is targeted, venv and PyPI deps are assumed pre-existing; command fails with clear message if venv missing.
- [F1.2] Replaced all `dir_linux`/`dir_windows` and `binary_linux`/`binary_windows` with consistent three-key `linux`/`macos`/`windows` objects throughout build.yaml schema. Added explicit macOS values (shares `venv-linux` dir, has own binary paths).
- [F1.3] Changed CLI build strategy to native-only (no cross-compilation). Removed `GOOS=<os>` and `--target=bun-<os>-x64` in favor of host-default builds. Added explicit "No cross-compilation" policy and platform output path mapping.
- [F1.4] Restructured `tool_install` to separate `url` (always shown) from `auto` (optional per-platform). Removed all `sudo`-requiring commands from auto-install (node/go on Linux now manual-only). Added description of install behavior: prompt before auto, manual instructions when no auto available, never runs `sudo`.
- [F1.5] Replaced "activate venv, run command" with deterministic `spawn(getVenvBin(path), [entry])` — no shell activation needed. The venv Python binary already has the correct `sys.prefix`. Updated launcher config to use `entry` field instead of `cmd: python ...`.
