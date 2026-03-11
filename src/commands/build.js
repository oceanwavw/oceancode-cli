'use strict';

const path = require('path');
const { loadConfig, requireSection } = require('../lib/configLoader');
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
  console.error('  --config <path>    Config file (default: oceancode.yaml)');
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
  if (args.length === 0 && process.stdin.isTTY) {
    const { select, multiselect, isCancel } = require('@clack/prompts');
    const defaults = require('../lib/defaults');
    const target = await select({
      message: 'Build target:',
      options: [
        { value: 'all', label: 'all — Build everything' },
        { value: 'backends', label: 'backends — Python backend packages' },
        { value: 'frontends', label: 'frontends — Node.js frontend apps' },
        { value: 'cli', label: 'cli — CLI tool binaries' },
      ],
    });
    if (isCancel(target)) process.exit(0);
    args = [target];

    // Follow-up package picker for specific targets
    const targetPackages = {
      backends: defaults.pythonVenvTargets,
      frontends: defaults.frontendTargets,
      cli: defaults.goTargets,
    };
    const packages = targetPackages[target];
    if (packages && packages.length > 0) {
      const selected = await multiselect({
        message: `Select ${target} packages:`,
        options: packages.map(p => ({ value: p.name, label: p.name, hint: p.path })),
        initialValues: packages.map(p => p.name),
      });
      if (isCancel(selected)) process.exit(0);
      if (selected.length === 1) {
        args.push(selected[0]);
      }
    }
  }

  const { target, pkg, flags } = parseArgs(args);

  // Resolve config path
  const workspaceRoot = process.cwd();
  const configPath = flags.config || path.join(workspaceRoot, 'oceancode.yaml');
  const config = loadConfig(configPath);
  requireSection(config, 'build');

  // Determine which targets to build
  const buildTargets = target === 'all' ? ['backends', 'frontends', 'cli'] : [target];

  // Preflight
  if (!flags.skipPreflight) {
    console.log('Pre-flight checks...');
    const ok = await runPreflight(config.build, buildTargets);
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
          await buildBackends(config.build, workspaceRoot, pkg);
          break;
        case 'frontends':
          console.log('========================================');
          console.log(' Building Node.js Frontends');
          console.log('========================================');
          await buildFrontends(config.build, workspaceRoot, pkg);
          break;
        case 'cli':
          console.log('========================================');
          console.log(' Building CLI Tools');
          console.log('========================================');
          await buildCli(config.build, workspaceRoot, pkg);
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
