#!/usr/bin/env node
'use strict';

const path = require('path');

const GROUPS = {
  sync: path.join(__dirname, '..', 'src', 'commands', 'sync'),
  'git-dev': path.join(__dirname, '..', 'src', 'commands', 'git-dev'),
  'git-prod': path.join(__dirname, '..', 'src', 'commands', 'git-prod'),
  'clone-prod': path.join(__dirname, '..', 'src', 'commands', 'clone-prod'),
  build: path.join(__dirname, '..', 'src', 'commands', 'build'),
  launch: path.join(__dirname, '..', 'src', 'commands', 'launch'),
  init: path.join(__dirname, '..', 'src', 'commands', 'init'),
};

const HELP = `
oceancode — OceanWave multi-repo workspace CLI

USAGE
  oceancode <command> [action] [args] [flags]

SETUP (run once)
  1. cd into your dev workspace root
  2. oceancode init              — generate oceancode.yaml via interactive wizard
  3. oceancode clone-prod <url>  — clone all repos into prod directory

DAILY WORKFLOW
  oceancode sync dev2prod [repos]   — push dev changes to prod
  oceancode sync prod2dev [repos]   — pull prod changes back to dev
  oceancode git-dev status [repos]  — check git status across dev repos
  oceancode git-prod status [repos] — check git status across prod repos
  oceancode git-prod commit [repos] <msg> — commit across prod repos
  oceancode git-prod push [repos] <remote> — push prod repos
  oceancode build [target] [package]       — build packages
  oceancode launch <app>                   — launch a dev app

COMMANDS

  init
    Interactive wizard to generate oceancode.yaml.
    No arguments. Prompts for prod_root, repos, build targets, launchers.

  clone-prod [base-url]
    Clone all repos from config into the prod directory.
    Flags: --config <path>

  sync <action> [repos] [flags]
    Sync files between dev and prod directories.
    Actions: dev2prod, prod2dev, prune
    Flags: --mirror    delete files not in dev allowlist (dev2prod only)
           --force     skip timestamp comparison
           --dry-run   show what would happen without doing it
           --verbose   show per-file actions
           --config <path>

  git-dev <action> [repos]
    Git operations on dev repos. Currently supports: status
    Flags: --config <path>

  git-prod <action> [repos] [args]
    Git operations on prod repos with .prodroot safety guard.
    Actions: status, init, commit, push, pull, fetch, remote-add
      status                    — show git status
      init                      — git init + seed .gitignore
      commit <message>          — stage all and commit
      push <remote>             — push to remote
      pull <remote>             — pull from remote
      fetch <remote>            — fetch from remote
      remote-add <name> <url>   — add a remote
    Flags: --config <path>

  build [target] [package]
    Build backend, frontend, and CLI packages.
    Targets: all (default), backends, frontends, cli
    Package: optional specific package name within target
    Flags: --skip-preflight   skip tool availability checks
           --config <path>

  launch <app>
    Launch a configured application in dev mode.
    App name must match a key in the launchers section of oceancode.yaml.
    Flags: --config <path>

CONFIG
  All commands read from oceancode.yaml in the current directory.
  Run \`oceancode init\` to generate it. Override with --config <path>.
  Dev root is always the current working directory.
  Prod root is set in config under workspace.prod_root.

.PRODINCLUDE
  Each dev repo needs a .prodinclude file to use \`oceancode sync\`.
  It defines which files get synced to prod using glob patterns.

  Create it at the root of each repo:

    # Example .prodinclude
    src/**                  # include all source files
    package.json            # include specific files
    *.py                    # wildcards work
    !**/tests/**            # exclude with ! prefix
    !**/*.spec              # exclude test specs

  Built-in safety: .git, node_modules, __pycache__, dist, venv-*,
  .env, and IDE folders are always excluded regardless of patterns.
  See source for full list: src/lib/shared.js SAFETY_NEGATIONS.

GLOBAL FLAGS
  --help, -h    Show help (per-command or global)
  --config <f>  Path to oceancode.yaml (default: ./oceancode.yaml)
`.trimStart();

const group = process.argv[2];
if (!group || group === '--help' || group === '-h' || !GROUPS[group]) {
  if (group && group !== '--help' && group !== '-h' && !GROUPS[group]) {
    console.error(`Unknown command: ${group}\n`);
  }
  console.log(HELP);
  process.exit(group === '--help' || group === '-h' ? 0 : 1);
}

require(GROUPS[group]).run(process.argv.slice(3));
