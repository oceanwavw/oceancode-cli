# Dispatcher Pattern

The `oceancode` CLI uses a simple dispatcher pattern: `bin/oceancode.js` maps the first arg to a command module path, requires it, and calls `.run(remainingArgs)`. Each command module in `src/commands/` handles its own arg parsing and action routing.

This keeps the entry point minimal (~15 lines) and each command module self-contained. Adding a new command group only requires adding one entry to the GROUPS map.

## Positional Arg Ambiguity

When a command has both repo-filter and action-specific positional args (e.g., `oceancode git commit myrepo "message" -t /path`), parsing is ambiguous. The solution is `EXPECTED_POSITIONALS` — each action declares how many positionals it consumes. Extra positionals are treated as repo filters. This avoids needing to look up config during arg parsing.
