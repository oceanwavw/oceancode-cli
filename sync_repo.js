#!/usr/bin/env node
'use strict';

const path = require('path');

const COMMANDS = ['dev2prod', 'prod2dev', 'prune', 'batch'];

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0];
  if (!command || !COMMANDS.includes(command)) {
    console.error(`Usage: sync_repo.js <${COMMANDS.join('|')}> [options]`);
    console.error('');
    console.error('Commands:');
    console.error('  dev2prod  --dev <path> --prod <path> [--mirror] [--force] [--dry-run] [--verbose]');
    console.error('  prod2dev  --dev <path> --prod <path> [--force] [--dry-run] [--verbose]');
    console.error('  prune     --dev <path> --deletelist <file> [--dry-run]');
    console.error('  batch     --list <file> [--config <file>] [--mirror] [--force] [--dry-run] [--verbose]');
    process.exit(1);
  }

  const flags = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--mirror') { flags.mirror = true; continue; }
    if (arg === '--force') { flags.force = true; continue; }
    if (arg === '--dry-run') { flags.dryRun = true; continue; }
    if (arg === '--verbose') { flags.verbose = true; continue; }
    if (arg === '--dev' && args[i + 1]) { flags.dev = path.resolve(args[++i]); continue; }
    if (arg === '--prod' && args[i + 1]) { flags.prod = path.resolve(args[++i]); continue; }
    if (arg === '--deletelist' && args[i + 1]) { flags.deletelist = path.resolve(args[++i]); continue; }
    if (arg === '--list' && args[i + 1]) { flags.list = path.resolve(args[++i]); continue; }
    if (arg === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }

  return { command, flags };
}

async function main() {
  const { command, flags } = parseArgs(process.argv);

  if (command === 'dev2prod') {
    if (!flags.dev || !flags.prod) {
      console.error('dev2prod requires --dev <path> and --prod <path>');
      process.exit(1);
    }
    const { dev2prod } = require('./lib/dev2prod');
    process.exit(await dev2prod(flags));
  }

  if (command === 'prod2dev') {
    if (!flags.dev || !flags.prod) {
      console.error('prod2dev requires --dev <path> and --prod <path>');
      process.exit(1);
    }
    const { prod2dev } = require('./lib/prod2dev');
    process.exit(await prod2dev(flags));
  }

  if (command === 'batch') {
    const { batch } = require('./lib/batch');
    process.exit(await batch(flags));
  }

  if (command === 'prune') {
    if (!flags.dev || !flags.deletelist) {
      console.error('prune requires --dev <path> and --deletelist <file>');
      process.exit(1);
    }
    const { prune } = require('./lib/prune');
    process.exit(await prune(flags));
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(err.isValidation ? 1 : 2);
});
