# execSync: Always Use shell: true for Command Strings

When using `child_process.execSync()` or `spawn()` with a command string (not an array), always pass `shell: true`. Without it, Node.js treats the entire string as an executable name, which fails for:

- Commands with arguments (`which node`, `where git`)
- Shell builtins (`call`, `cd`)
- Pipe chains (`curl ... | sh`)
- Commands relying on PATH resolution

Pattern:
```js
execSync(cmd, { stdio: 'inherit', shell: true });
```

This applies to all execSync calls in the build system: `checkTool()`, `promptInstall()`, `runCmd()`, and verification commands.
