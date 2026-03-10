'use strict';

const path = require('path');
const { loadBuildConfig } = require('../lib/build/buildConfig');
const { runPreflight } = require('../lib/build/preflight');
const { buildBackends } = require('../lib/build/backends');
const { buildFrontends } = require('../lib/build/frontends');
const { buildCli } = require('../lib/build/cli');

const TARGETS = ['all', 'backends', 'frontends', 'cli'];

function usage() {
  console.error('Usage: oceancode build [target] [package] [flags]');
  console.error('');
  console.error('Targets:');
  console.error('  all          Build everything (default)');
  console.error('  backends     Python backend packages');
  console.error('  frontends    Node.js frontend apps');
  console.error('  cli          CLI tool binaries');
  console.error('');
  console.error('Flags:');
  console.error('  --config <path>    Config file (default: ../build.yaml)');
  console.error('  --skip-preflight   Skip tool checks');
  process.exit(1);
}

function parseArgs(args) {
  let target = 'all';
  let pkg = null;
  const flags = { skipPreflight: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--skip-preflight') { flags.skipPreflight = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-')) {
      if (target === 'all' && TARGETS.includes(a)) { target = a; continue; }
      if (target !== 'all' && !pkg) { pkg = a; continue; }
      if (!TARGETS.includes(a)) throw new Error(`Unknown build target: ${a}`);
    }
  }

  return { target, pkg, flags };
}

async function run(args) {
  const { target, pkg, flags } = parseArgs(args);

  // Resolve config path
  const scriptsDir = path.resolve(__dirname, '..', '..');
  const workspaceRoot = path.resolve(scriptsDir, '..');
  const configPath = flags.config || path.join(workspaceRoot, 'build.yaml');
  const config = loadBuildConfig(configPath);

  // Determine which targets to build
  const buildTargets = target === 'all' ? ['backends', 'frontends', 'cli'] : [target];

  // Preflight
  if (!flags.skipPreflight) {
    console.log('Pre-flight checks...');
    const ok = await runPreflight(config, buildTargets);
    if (!ok) {
      console.error('Pre-flight checks failed');
      process.exit(1);
    }
    console.log('All pre-flight checks passed!\n');
  }

  // Build
  try {
    for (const t of buildTargets) {
      switch (t) {
        case 'backends':
          console.log('========================================');
          console.log(' Building Python Backend');
          console.log('========================================');
          await buildBackends(config, workspaceRoot, pkg);
          break;
        case 'frontends':
          console.log('========================================');
          console.log(' Building Node.js Frontends');
          console.log('========================================');
          await buildFrontends(config, workspaceRoot, pkg);
          break;
        case 'cli':
          console.log('========================================');
          console.log(' Building CLI Tools');
          console.log('========================================');
          await buildCli(config, workspaceRoot, pkg);
          break;
      }
    }
    console.log('\n========================================');
    console.log(' Build Complete!');
    console.log('========================================\n');
  } catch (e) {
    console.error(`\nBuild failed: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { run, parseArgs };
