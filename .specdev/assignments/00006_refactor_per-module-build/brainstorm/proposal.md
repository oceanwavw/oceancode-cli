# Proposal: Per-Module Build System

Replace the central category-based build system (`pythonVenvTargets`/`frontendTargets`/`goTargets` in defaults.js, with dedicated builders in `src/lib/build/`) with per-module `oceancode.build.yaml` files. Each buildable module declares its own required tools and platform-specific build steps. `oceancode build` becomes a thin runner that reads each module's yaml and executes steps for the current platform.

This eliminates central knowledge of how to build each language/framework, makes adding new modules self-service (just drop a yaml file), and simplifies the init wizard from 3 category selects to one module list.
