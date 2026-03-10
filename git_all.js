#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const COMMANDS = ['status', 'commit', 'push', 'pull', 'fetch', 'remote-add', 'init'];

function usage() {
  console.error('Usage: git_all.js <command> [args] --dev|--prod [--list <file>] [--config <file>]');
  console.error('');
  console.error('Commands:');
  console.error('  status                     Show git status for all repos');
  console.error('  commit "message"           Add all and commit with message');
  console.error('  push <remote>              Push main to remote');
  console.error('  pull <remote>              Pull main from remote');
  console.error('  fetch <remote>             Fetch from remote');
  console.error('  remote-add <name> <url>    Add remote to all repos');
  console.error('  init                       Git init + initial commit');
  console.error('');
  console.error('Required:');
  console.error('  --dev            Operate on dev (source) repos');
  console.error('  --prod           Operate on prod (target) repos');
  console.error('');
  console.error('Options:');
  console.error('  --list <file>    Only process repos listed in file');
  console.error('  --config <file>  Config file (default: sync_repos.json)');
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  if (!command || !COMMANDS.includes(command)) usage();

  const flags = { positional: [] };
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dev') { flags.env = 'dev'; continue; }
    if (arg === '--prod') { flags.env = 'prod'; continue; }
    if (arg === '--list' && args[i + 1]) { flags.list = path.resolve(args[++i]); continue; }
    if (arg === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    flags.positional.push(arg);
  }
  if (!flags.env) {
    console.error('ERROR: must specify --dev or --prod\n');
    usage();
  }
  return { command, flags };
}

function loadRepos(flags) {
  const configPath = flags.config || path.join(__dirname, 'sync_repos.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const base = path.resolve(flags.env === 'prod' ? config.target : config.source);

  let repoNames = Object.keys(config.repos);
  if (flags.list) {
    const listContent = fs.readFileSync(flags.list, 'utf8');
    const listed = listContent.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const unknown = listed.filter(n => !config.repos[n]);
    if (unknown.length > 0) {
      console.error(`Unknown repos: ${unknown.join(', ')}`);
      process.exit(1);
    }
    repoNames = listed;
  }

  return repoNames.map(name => ({
    name,
    dir: path.join(base, config.repos[name].path),
  }));
}

function git(cwd, cmd) {
  return execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function run() {
  const { command, flags } = parseArgs(process.argv);
  const repos = loadRepos(flags);

  const mode = flags.env === 'prod' ? 'prod' : 'dev';
  console.log(`Mode: ${mode}\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < repos.length; i++) {
    const { name, dir } = repos[i];

    if (!fs.existsSync(dir)) {
      console.log(`[${i + 1}/${repos.length}] ${name} — directory not found, skipping`);
      skipped++;
      continue;
    }

    const hasGit = fs.existsSync(path.join(dir, '.git'));

    if (command !== 'init' && !hasGit) {
      console.log(`[${i + 1}/${repos.length}] ${name} — not a git repo, skipping`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${repos.length}] ${name}`);

    try {
      switch (command) {
        case 'init': {
          if (hasGit) {
            console.log('  already a git repo, skipping');
            skipped++;
            break;
          }
          git(dir, 'init -b main');
          git(dir, 'add -A');
          git(dir, 'commit -m "initial commit"');
          console.log('  initialized + initial commit');
          passed++;
          break;
        }

        case 'status': {
          try { git(dir, 'checkout main'); } catch {}
          const out = git(dir, 'status --short');
          if (out) {
            console.log(out);
          } else {
            console.log('  clean');
          }
          passed++;
          break;
        }

        case 'commit': {
          const msg = flags.positional[0];
          if (!msg) { console.error('  ERROR: commit requires a message'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          git(dir, 'add -A');
          try {
            const out = git(dir, `commit -m "${msg.replace(/"/g, '\\"')}"`);
            console.log('  committed');
            passed++;
          } catch (e) {
            if (e.stderr && e.stderr.includes('nothing to commit')) {
              console.log('  nothing to commit');
              passed++;
            } else {
              throw e;
            }
          }
          break;
        }

        case 'push': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: push requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`);
            skipped++;
            break;
          }
          git(dir, `push ${remote} main`);
          console.log(`  pushed to ${remote}/main`);
          passed++;
          break;
        }

        case 'pull': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: pull requires a remote name'); failed++; break; }
          try { git(dir, 'checkout main'); } catch {}
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`);
            skipped++;
            break;
          }
          git(dir, `pull ${remote} main`);
          console.log(`  pulled from ${remote}/main`);
          passed++;
          break;
        }

        case 'fetch': {
          const remote = flags.positional[0];
          if (!remote) { console.error('  ERROR: fetch requires a remote name'); failed++; break; }
          try { git(dir, `remote get-url ${remote}`); } catch {
            console.log(`  remote '${remote}' not found, skipping`);
            skipped++;
            break;
          }
          git(dir, `fetch ${remote}`);
          console.log(`  fetched from ${remote}`);
          passed++;
          break;
        }

        case 'remote-add': {
          const remoteName = flags.positional[0];
          const baseUrl = flags.positional[1];
          if (!remoteName || !baseUrl) {
            console.error('  ERROR: remote-add requires <name> <base-url>');
            failed++;
            break;
          }
          const url = `${baseUrl.replace(/\/$/, '')}/${name}.git`;
          try {
            git(dir, `remote get-url ${remoteName}`);
            console.log(`  remote '${remoteName}' already exists, skipping`);
            skipped++;
          } catch {
            git(dir, `remote add ${remoteName} ${url}`);
            console.log(`  added ${remoteName} → ${url}`);
            passed++;
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

run();
