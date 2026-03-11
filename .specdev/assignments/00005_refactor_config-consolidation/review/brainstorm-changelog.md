# Brainstorm Changelog

## Round 1

### F1.1 — Required sections per command
Added "Required Sections per Command" table specifying which config sections each command needs, with explicit error format when sections are missing.

### F1.2 — Path resolution rules
Added "Path Resolution Rules" section: `prod_root` resolved as absolute (relative against cwd), repo paths always relative to cwd, `--config` file path resolved against cwd, all paths inside config resolved against cwd (not config file directory).

### F1.3 — `.gitignore` merge behavior
Added merge/idempotency specification: if `.gitignore` exists, append only entries not already present (line-by-line dedup). Never overwrite or remove existing entries.

### F1.4 — Implementation sequencing
Added "Implementation Sequencing" section with 6 staged steps: unified loader first, then migrate commands, then renames, then gitignore, then init wizard, then cleanup. Each step independently testable.
