# Codex Reviewer: Sandbox Limitations

The Codex reviewer runs in a restricted sandbox that throws `EPERM` for `execSync` calls, even with `shell: true`. This causes false negatives for tool detection tests (`checkTool('node')` returns `false` in sandbox but `true` in real environment).

This consumed all 3 review rounds on assignment 00003 on the same false-positive finding.

Mitigation: when Codex reports failures for shell-execution-based tests, verify locally before treating as a real bug. Consider noting this limitation in reviewer instructions.
