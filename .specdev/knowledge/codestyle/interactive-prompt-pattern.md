# Interactive Prompt Pattern

All oceancode commands follow the same interactive prompt pattern using `@clack/prompts`:

## TTY Guard
```js
if (args.length === 0 && process.stdin.isTTY) {
  // show prompts
}
```

For commands with required flags that may be partially provided:
```js
const parsed = parseArgs(args);
if (!parsed.requiredFlag && process.stdin.isTTY) {
  // prompt for missing flag
}
```

## Key Rules
- Prompts only when args are missing AND stdin is a TTY
- When args are provided via CLI, skip all prompts (scriptability contract)
- Multi-select defaults: all items pre-checked via `initialValues`
- Cancel handling: `isCancel(result)` → `process.exit(0)`
- Import `@clack/prompts` lazily inside the TTY guard block (not at top of file)

## Atomic Config Writes
Config wizard uses temp-file + rename pattern (`writeConfigAtomic` in `configGen.js`).
Always preview YAML and confirm before writing.
