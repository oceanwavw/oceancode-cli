'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, requireSection, resolveRepos } = require('../lib/configLoader');

const ACTIONS = ['status', 'commit', 'push', 'pull', 'fetch', 'remote-add', 'init'];
const READ_ONLY = ['status', 'fetch'];

function isReadOnly(action) {
  return READ_ONLY.includes(action);
}

function requireProdroot(dir) {
  if (!fs.existsSync(path.join(dir, '.prodroot'))) {
    throw new Error(`.prodroot not found in ${dir} — destructive git ops require .prodroot marker`);
  }
}

function usage() {
  console.error('Usage: oceancode git-prod <action> [repos] [args] [--config <f>]');
  console.error('');
  console.error('Actions:');
  console.error('  status                     Show git status');
  console.error('  commit "message"           Add all and commit');
  console.error('  push <remote>              Push main to remote');
  console.error('  pull <remote>              Pull main from remote');
  console.error('  fetch <remote>             Fetch from remote');
  console.error('  remote-add <name> <url>    Add remote to all repos');
  console.error('  init                       Git init + initial commit');
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
    const { select, multiselect, isCancel } = require('@clack/prompts');
    const action = await select({
      message: 'Git action:',
      options: ACTIONS.map(a => ({ value: a, label: a })),
    });
    if (isCancel(action)) process.exit(0);

    args = [action];

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
  requireSection(config, 'workspace.prod_root');
  requireSection(config, 'repos');

  const prodRoot = path.resolve(config.workspace.prod_root);

  // Determine how many positional args the action consumes
  const EXPECTED_POSITIONALS = {
    status: 0, init: 0, commit: 1, push: 1, pull: 1, fetch: 1, 'remote-add': 2,
  };
  const expected = EXPECTED_POSITIONALS[action];

  // First positional may be a repo filter (single name or comma-delimited)
  let repoArg = null;
  if (flags.positional.length > expected) {
    repoArg = flags.positional.shift();
  }

  const repos = resolveRepos(config, repoArg);
  let passed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const dir = path.join(prodRoot, repo.path);

    if (!fs.existsSync(dir)) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — directory not found, skipping`);
      skipped++; continue;
    }

    const hasGit = fs.existsSync(path.join(dir, '.git'));

    if (!isReadOnly(action)) {
      try { requireProdroot(dir); } catch (e) {
        console.log(`[${i + 1}/${repos.length}] ${repo.name} — ${e.message}`);
        skipped++; continue;
      }
    }

    if (action !== 'init' && !hasGit) {
      console.log(`[${i + 1}/${repos.length}] ${repo.name} — not a git repo, skipping`);
      skipped++; continue;
    }

    console.log(`[${i + 1}/${repos.length}] ${repo.name}`);

    try {
      switch (action) {
        case 'init': {
          if (hasGit) { console.log('  already initialized, skipping'); skipped++; break; }
          git(dir, 'init -b main');
          git(dir, 'add -A');
          git(dir, 'commit -m "initial commit"');
          console.log('  initialized + initial commit');
          passed++; break;
        }
        case 'status': {
          try { git(dir, 'checkout main'); } catch {}
          const out = git(dir, 'status --short');
          console.log(out || '  clean');
          passed++; break;
        }
        case 'commit': {
          const msg = flags.positional[0];
          if (!msg) { console.error('  ERROR: commit requires a message'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          git(dir, 'add -A');
          try {
            git(dir, `commit -m "${msg.replace(/"/g, '\\"')}"`);
            console.log('  committed');
            passed++;
          } catch (e) {
            if (e.stderr && e.stderr.includes('nothing to commit')) {
              console.log('  nothing to commit'); passed++;
            } else { throw e; }
          }
          break;
        }
        case 'push': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: push requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `push ${remote} main`);
          console.log(`  pushed to ${remote}/main`);
          passed++; break;
        }
        case 'pull': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: pull requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `pull ${remote} main`);
          console.log(`  pulled from ${remote}/main`);
          passed++; break;
        }
        case 'fetch': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: fetch requires a remote name'); failed++; break; }
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`); skipped++; break;
          }
          git(dir, `fetch ${remote}`);
          console.log(`  fetched from ${remote}`);
          passed++; break;
        }
        case 'remote-add': {
          const remoteName = flags.positional[0];
          const baseUrl = flags.positional[1];
          if (!remoteName || !baseUrl) {
            console.error('  ERROR: remote-add requires <name> <base-url>'); failed++; break;
          }
          const url = `${baseUrl.replace(/\/$/, '')}/${repo.name}.git`;
          try {
            git(dir, `remote get-url ${remoteName}`);
            console.log(`  remote '${remoteName}' already exists, skipping`); skipped++;
          } catch {
            git(dir, `remote add ${remoteName} ${url}`);
            console.log(`  added ${remoteName} -> ${url}`); passed++;
          }
          break;
        }
      }
    } catch (e) {
      const msg = e.stderr ? e.stderr.trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run, parseArgs, ACTIONS, isReadOnly, requireProdroot };
