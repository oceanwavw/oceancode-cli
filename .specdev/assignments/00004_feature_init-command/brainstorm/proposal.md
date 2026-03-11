# Proposal — Interactive Init Command

Add `@clack/prompts` as a dependency and build an interactive prompt layer across the oceancode CLI. The primary deliverable is `oceancode init` — a wizard that generates `sync_repos.yaml` and `build.yaml` from hardcoded defaults via multi-select prompts. Secondary deliverables add multi-select repo/target pickers to `install`, `git`, `build`, `sync`, and `launch` commands when invoked without explicit arguments.

This eliminates the need for users to manually write YAML config files and makes every command more discoverable. All prompts are skipped when arguments are provided explicitly, preserving scriptability.
