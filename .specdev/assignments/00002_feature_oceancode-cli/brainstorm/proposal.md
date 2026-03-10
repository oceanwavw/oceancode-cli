# Proposal: Build the oceancode CLI

Refactor the `scripts/` repo from three standalone Node.js scripts (`sync_repo.js`, `git_all.js`, `install.js`) into a single `oceancode` CLI with a dispatcher pattern. The existing lib internals are solid — the main work is restructuring entry points, merging three scripts into one dispatcher, and converting the config from JSON to YAML. Machine-specific paths move from config to explicit command flags (`-s`, `-t`), making the config portable across machines.
