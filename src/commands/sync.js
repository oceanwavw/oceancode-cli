'use strict';

const path = require('path');
const { loadConfig, resolveRepos } = require('../lib/config');
const { dev2prod } = require('../lib/dev2prod');
const { prod2dev } = require('../lib/prod2dev');
const { prune } = require('../lib/prune');

const ACTIONS = ['dev2prod', 'prod2dev', 'prune'];

function usage() {
  console.error('Usage: oceancode sync <dev2prod|prod2dev|prune> [repos] -s <source> -t <target> [flags]');
  console.error('');
  console.error('Actions:');
  console.error('  dev2prod    Sync from dev to prod');
  console.error('  prod2dev    Sync from prod to dev');
  console.error('  prune       Execute .prod_deletes list');
  console.error('');
  console.error('Flags:');
  console.error('  -s <path>      Source (dev) base path');
  console.error('  -t <path>      Target (prod) base path');
  console.error('  --mirror       Delete files not in dev allowlist (dev2prod only)');
  console.error('  --force        Skip timestamp comparison');
  console.error('  --dry-run      Show what would happen');
  console.error('  --verbose      Show per-file actions');
  console.error('  --config <f>   Config file (default: ./sync_repos.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  const action = args[0];
  if (!action || !ACTIONS.includes(action)) usage();

  const flags = {};
  let repoArg = null;

  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a === '-s' && args[i + 1]) { flags.source = path.resolve(args[++i]); continue; }
    if (a === '-t' && args[i + 1]) { flags.target = path.resolve(args[++i]); continue; }
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--mirror') { flags.mirror = true; continue; }
    if (a === '--force') { flags.force = true; continue; }
    if (a === '--dry-run') { flags.dryRun = true; continue; }
    if (a === '--verbose') { flags.verbose = true; continue; }
    if (!repoArg && !a.startsWith('-')) { repoArg = a; continue; }
    usage();
  }

  if (!flags.source) { console.error('Error: missing -s <source>'); process.exit(1); }
  if (!flags.target) { console.error('Error: missing -t <target>'); process.exit(1); }

  return { action, repoArg, flags };
}

async function run(args) {
  const { action, repoArg, flags } = parseArgs(args);
  const config = loadConfig(flags.config);
  const repos = resolveRepos(config, repoArg);

  let passed = 0, failed = 0;

  for (let i = 0; i < repos.length; i++) {
    const repo = repos[i];
    const devDir = path.join(flags.source, repo.path);
    const prodDir = path.join(flags.target, repo.path);
    console.log(`[${i + 1}/${repos.length}] ${repo.name}`);

    try {
      let exitCode;
      switch (action) {
        case 'dev2prod':
          exitCode = await dev2prod({
            dev: devDir, prod: prodDir,
            mirror: flags.mirror, force: flags.force,
            dryRun: flags.dryRun, verbose: flags.verbose,
          });
          break;
        case 'prod2dev':
          exitCode = await prod2dev({
            dev: devDir, prod: prodDir,
            force: flags.force, dryRun: flags.dryRun,
            verbose: flags.verbose,
          });
          break;
        case 'prune': {
          const deletelist = path.join(devDir, '.prod_deletes');
          exitCode = await prune({
            dev: devDir, deletelist,
            dryRun: flags.dryRun,
          });
          break;
        }
      }
      if (exitCode === 0) passed++;
      else failed++;
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run };
