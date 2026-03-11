// src/commands/build.js
'use strict';

const path = require('path');
const { execSync } = require('child_process');
const { loadConfig, requireSection } = require('../lib/configLoader');
const { loadBuildYaml, resolveSteps, validateBuildList } = require('../lib/buildLoader');
const { checkTool, promptInstall } = require('../lib/build/preflight');
const { getPlatform } = require('../lib/build/platform');
const defaults = require('../lib/defaults');

function usage() {
  console.error('Usage: oceancode build [module] [flags]');
  console.error('');
  console.error('  oceancode build              Build all active modules');
  console.error('  oceancode build <module>      Build a single module');
  console.error('');
  console.error('Flags:');
  console.error('  --config <path>    Config file (default: oceancode.yaml)');
  console.error('  --skip-preflight   Skip tool checks');
  process.exit(1);
}

function parseArgs(args) {
  let module = null;
  const flags = { skipPreflight: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--skip-preflight') { flags.skipPreflight = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-') && !module) { module = a; continue; }
  }

  return { module, flags };
}

async function run(args) {
  const { module: targetModule, flags } = parseArgs(args);

  const workspaceRoot = process.cwd();
  const config = loadConfig(flags.config);
  requireSection(config, 'build');
  requireSection(config, 'repos');

  const buildList = config.build;
  if (!Array.isArray(buildList)) {
    console.error('Error: build section in oceancode.yaml must be a list of module names');
    process.exit(1);
  }
  try {
    validateBuildList(buildList);
  } catch (e) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }

  // Filter to single module if specified
  let modulesToBuild = buildList;
  if (targetModule) {
    if (!buildList.includes(targetModule)) {
      console.error(`Module '${targetModule}' is not in the build list. Add it to oceancode.yaml build section.`);
      process.exit(1);
    }
    modulesToBuild = [targetModule];
  }

  // Resolve paths and load build yamls
  const repoMap = config.repos;
  const modules = [];
  for (const name of modulesToBuild) {
    if (!repoMap[name]) {
      console.error(`Build module '${name}' not found in repos config`);
      process.exit(1);
    }
    const moduleDir = path.resolve(workspaceRoot, repoMap[name]);
    if (!require('fs').existsSync(moduleDir)) {
      console.error(`Module '${name}' directory not found: ${moduleDir}`);
      process.exit(1);
    }
    const buildConfig = loadBuildYaml(moduleDir, name);
    modules.push({ name, dir: moduleDir, config: buildConfig });
  }

  // Preflight: collect all tools, deduplicate, check
  if (!flags.skipPreflight) {
    const allTools = [...new Set(modules.flatMap(m => m.config.tools))];
    if (allTools.length > 0) {
      console.log('Pre-flight checks...');
      for (const tool of allTools) {
        if (checkTool(tool)) {
          console.log(`  [OK] ${tool}`);
        } else {
          const installInfo = defaults.toolInstall[tool];
          if (!installInfo) {
            console.error(`  [MISSING] ${tool} — no install info configured`);
            process.exit(1);
          }
          const ok = await promptInstall(tool, installInfo);
          if (!ok) process.exit(1);
          console.log(`  [INSTALLED] ${tool}`);
        }
      }
      console.log('');
    }
  }

  // Execute builds
  const platform = getPlatform();
  let passed = 0, failed = 0, skipped = 0;

  for (const mod of modules) {
    console.log(`[${passed + failed + skipped + 1}/${modules.length}] ${mod.name}`);
    const steps = resolveSteps(mod.config.steps, platform, mod.name);
    if (!steps) {
      console.log(`  skipped — no steps for platform '${platform}'`);
      skipped++;
      continue;
    }

    let stepFailed = false;
    for (let i = 0; i < steps.length; i++) {
      const cmd = steps[i];
      console.log(`  [${i + 1}/${steps.length}] ${cmd}`);
      try {
        execSync(cmd, { cwd: mod.dir, stdio: 'inherit', shell: true });
      } catch (e) {
        console.error(`  FAILED (exit code ${e.status || 1}): ${cmd}`);
        stepFailed = true;
        break;
      }
    }

    if (stepFailed) { failed++; } else { passed++; }
  }

  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped`);
  process.exit(failed > 0 ? 1 : 0);
}

module.exports = { run, parseArgs };
