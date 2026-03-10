#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

function usage() {
  console.error('Usage: install.js <base-url> [--config <file>]');
  console.error('');
  console.error('Clones all OceanWave repos from a git server.');
  console.error('Reads repo list from sync_repos.json.');
  console.error('');
  console.error('Example:');
  console.error('  node install.js http://10.88.90.147:3000/oceanwave');
  process.exit(1);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let baseUrl = null;
  let configPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) { configPath = path.resolve(args[++i]); continue; }
    if (!baseUrl) { baseUrl = args[i]; continue; }
    usage();
  }
  if (!baseUrl) usage();

  return { baseUrl: baseUrl.replace(/\/$/, ''), configPath };
}

function loadRepos(configPath, rootDir) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // Build repo list from sync_repos.json (excluding "scripts" — that's us)
  const repos = [];
  for (const [name, entry] of Object.entries(config.repos)) {
    if (name === 'scripts') continue;
    repos.push({ name, dir: path.join(rootDir, entry.path) });
  }

  return repos;
}

function ensureDirs(rootDir) {
  const dirs = ['lib', 'lib/front_ends', 'lib/back_ends', 'lib/cli', 'hubs'];
  for (const d of dirs) {
    const full = path.join(rootDir, d);
    if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
  }
}

function run() {
  const { baseUrl, configPath } = parseArgs(process.argv);
  const scriptDir = __dirname;
  const rootDir = path.resolve(scriptDir, '..');

  const cfgPath = configPath || path.join(scriptDir, 'sync_repos.json');
  const repos = loadRepos(cfgPath, rootDir);

  ensureDirs(rootDir);

  let cloned = 0;
  let skipped = 0;
  let failed = 0;

  console.log('========================================');
  console.log('OceanWave v1 Install - Clone All Repos');
  console.log('========================================');
  console.log(`Using base URL: ${baseUrl}`);
  console.log('');

  for (let i = 0; i < repos.length; i++) {
    const { name, dir } = repos[i];
    const relPath = path.relative(rootDir, dir);
    console.log(`[${i + 1}/${repos.length}] ${name} -> ${relPath}`);

    if (fs.existsSync(dir)) {
      const hasGit = fs.existsSync(path.join(dir, '.git'));
      console.log(`  skipped (already exists${hasGit ? '' : ', no .git'})`);
      skipped++;
      continue;
    }

    try {
      const url = `${baseUrl}/${name}.git`;
      execSync(`git clone "${url}" "${dir}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      console.log('  cloned');
      cloned++;
    } catch (e) {
      const msg = e.stderr ? e.stderr.toString().trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log('');
  console.log(`${cloned} cloned, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
