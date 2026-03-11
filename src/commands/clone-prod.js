'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { loadConfig, requireSection, resolveRepos } = require('../lib/configLoader');

function usage() {
  console.error('Usage: oceancode clone-prod <base-url> [--config <f>]');
  console.error('');
  console.error('Clones all repos into the prod directory.');
  process.exit(1);
}

function parseArgs(args) {
  let baseUrl = null;
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--help' || a === '-h') usage();
    if (!baseUrl && !a.startsWith('-')) { baseUrl = a; continue; }
  }
  if (baseUrl) baseUrl = baseUrl.replace(/\/$/, '');
  return { baseUrl, flags };
}

async function run(args) {
  let { baseUrl, flags } = parseArgs(args);
  const originalHadBaseUrl = !!baseUrl;

  if (!baseUrl && process.stdin.isTTY) {
    const { text, isCancel } = require('@clack/prompts');
    const urlResult = await text({ message: 'Git server base URL:' });
    if (isCancel(urlResult)) process.exit(0);
    baseUrl = urlResult.replace(/\/$/, '');
  }

  if (!baseUrl) usage();

  const config = loadConfig(flags.config);
  requireSection(config, 'workspace.prod_root');
  requireSection(config, 'repos');
  let repos = resolveRepos(config, null);

  if (process.stdin.isTTY && !originalHadBaseUrl) {
    const { multiselect, isCancel } = require('@clack/prompts');
    const selected = await multiselect({
      message: 'Select repos to clone:',
      options: repos.map(r => ({ value: r.name, label: r.name, hint: r.path })),
      initialValues: repos.map(r => r.name),
    });
    if (isCancel(selected)) process.exit(0);
    repos = repos.filter(r => selected.includes(r.name));
  }

  const rootDir = path.resolve(config.workspace.prod_root);

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

module.exports = { run, parseArgs };
