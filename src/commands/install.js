'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, resolveRepos } = require('../lib/config');

function usage() {
  console.error('Usage: oceancode install <base-url> [--config <f>]');
  console.error('');
  console.error('Clones all repos from a git server.');
  process.exit(1);
}

function parseArgs(args) {
  let baseUrl = null;
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (!baseUrl && !a.startsWith('-')) { baseUrl = a; continue; }
    usage();
  }
  if (!baseUrl) usage();
  return { baseUrl: baseUrl.replace(/\/$/, ''), flags };
}

async function run(args) {
  const { baseUrl, flags } = parseArgs(args);
  const config = loadConfig(flags.config);
  const repos = resolveRepos(config, null);
  const rootDir = process.cwd();

  const dirs = new Set();
  for (const repo of repos) {
    dirs.add(path.dirname(path.join(rootDir, repo.path)));
  }
  for (const d of dirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  let cloned = 0, skipped = 0, failed = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const dir = path.join(rootDir, repo.path);
    console.log(`[${i + 1}/${repos.length}] ${repo.name} -> ${repo.path}`);

    if (fs.existsSync(dir)) {
      const hasGit = fs.existsSync(path.join(dir, '.git'));
      console.log(`  skipped (already exists${hasGit ? '' : ', no .git'})`);
      skipped++; continue;
    }

    try {
      const url = `${baseUrl}/${repo.name}.git`;
      execSync(`git clone "${url}" "${dir}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
      console.log('  cloned');
      cloned++;
    } catch (e) {
      const msg = e.stderr ? e.stderr.toString().trim() : e.message;
      console.error(`  ERROR: ${msg}`);
      failed++;
    }
  }

  console.log(`\n${cloned} cloned, ${skipped} skipped, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run };
