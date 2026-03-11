'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, requireSection, resolveRepos } = require('../lib/configLoader');

const ACTIONS = ['status'];

function usage() {
  console.error('Usage: oceancode git-dev <action> [repos] [--config <f>]');
  console.error('');
  console.error('Actions:');
  console.error('  status    Show git status across dev repos');
  console.error('');
  console.error('Flags:');
  console.error('  --config <f>   Config file (default: ./oceancode.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  const action = args[0];
  if (!action || !ACTIONS.includes(action)) usage();

  const flags = { positional: [] };

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (!a.startsWith('-')) {
      flags.positional.push(a);
      continue;
    }
    usage();
  }

  return { action, flags };
}

function git(cwd, cmd) {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

async function run(args) {
  if (args.length === 0 && process.stdin.isTTY) {
    const { multiselect, isCancel } = require('@clack/prompts');

    args = ['status'];

    try {
      const config = loadConfig();
      const allRepos = resolveRepos(config, null);
      const selected = await multiselect({
        message: 'Select repos:',
        options: allRepos.map(r => ({ value: r.name, label: r.name, hint: r.path })),
        initialValues: allRepos.map(r => r.name),
      });
      if (isCancel(selected)) process.exit(0);
      if (selected.length < allRepos.length) {
        args.splice(1, 0, selected.join(','));
      }
    } catch {}
  }

  const { action, flags } = parseArgs(args);

  const config = loadConfig(flags.config);
  requireSection(config, 'repos');

  // First positional may be a repo filter
  let repoArg = null;
  if (flags.positional.length > 0) {
    repoArg = flags.positional.shift();
  }

  const repos = resolveRepos(config, repoArg);
  const devRoot = process.cwd();
  let passed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const dir = path.join(devRoot, repo.path);

    if (!fs.existsSync(dir)) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — directory not found, skipping`);
      skipped++; continue;
    }

    if (!fs.existsSync(path.join(dir, '.git'))) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — not a git repo, skipping`);
      skipped++; continue;
    }

    console.log(`[${i + 1}/${repos.length}] ${repo.name}`);

    try {
      try { git(dir, 'checkout main'); } catch {}
      const out = git(dir, 'status --short');
      console.log(out || '  clean');
      passed++;
    } catch (e) {
      const msg = e.stderr ? e.stderr.trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run, parseArgs, ACTIONS };
