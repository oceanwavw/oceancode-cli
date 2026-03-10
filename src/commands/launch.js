'use strict';

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { loadBuildConfig } = require('../lib/build/buildConfig');
const { getPlatformKey, getVenvBin } = require('../lib/build/platform');

function usage() {
  console.error('Usage: oceancode launch <app> [flags]');
  console.error('');
  console.error('Apps:   (defined in build.yaml launchers section)');
  console.error('');
  console.error('Flags:');
  console.error('  --prod           Run compiled/packaged version');
  console.error('  --config <path>  Config file (default: ../build.yaml)');
  process.exit(1);
}

function parseArgs(args) {
  let app = null;
  const flags = { prod: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config' && args[i + 1]) { flags.config = path.resolve(args[++i]); continue; }
    if (a === '--prod') { flags.prod = true; continue; }
    if (a === '--help' || a === '-h') usage();
    if (!a.startsWith('-') && !app) { app = a; continue; }
  }

  if (!app) usage();
  return { app, flags };
}

async function run(args) {
  const { app, flags } = parseArgs(args);

  const scriptsDir = path.resolve(__dirname, '..', '..');
  const workspaceRoot = path.resolve(scriptsDir, '..');
  const configPath = flags.config || path.join(workspaceRoot, 'build.yaml');
  const config = loadBuildConfig(configPath);

  const launchers = config.launchers || {};
  const launcherCfg = launchers[app];
  if (!launcherCfg) {
    const available = Object.keys(launchers).join(', ');
    console.error(`Unknown app: ${app}. Available: ${available}`);
    process.exit(1);
  }

  const platform = getPlatformKey();

  if (flags.prod) {
    // Prod mode: run binary
    const binaryMap = launcherCfg.prod && launcherCfg.prod.binary;
    if (!binaryMap || !binaryMap[platform]) {
      console.error(`No prod binary configured for ${app} on ${platform}`);
      process.exit(1);
    }
    const binaryPath = path.join(workspaceRoot, binaryMap[platform]);
    if (!fs.existsSync(binaryPath)) {
      console.error(`ERROR: ${binaryPath} not found — run "oceancode build" first`);
      process.exit(1);
    }
    console.log(`Launching ${app} (prod)...`);
    const child = spawn(binaryPath, [], { stdio: 'inherit', cwd: path.dirname(binaryPath) });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  // Dev mode
  const dev = launcherCfg.dev;
  if (!dev) {
    console.error(`No dev configuration for ${app}`);
    process.exit(1);
  }

  if (dev.venv_path && dev.entry) {
    // Python app: use venv python binary directly
    const venvConfig = config.venv && config.venv[app];
    let venvDir;
    if (venvConfig) {
      venvDir = venvConfig.dir[platform];
    } else {
      venvDir = platform === 'windows' ? 'venv-windows' : 'venv-linux';
    }
    const venvPath = path.join(workspaceRoot, dev.venv_path, venvDir);
    const pythonBin = getVenvBin(venvPath);

    if (!fs.existsSync(pythonBin)) {
      console.error(`ERROR: ${pythonBin} not found — run "oceancode build backends" first`);
      process.exit(1);
    }

    const entryPath = dev.entry;
    const cwd = path.join(workspaceRoot, dev.venv_path);
    console.log(`Launching ${app} (dev)...`);
    const child = spawn(pythonBin, [entryPath], { stdio: 'inherit', cwd });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  if (dev.cwd && dev.cmd) {
    // Node/generic app: run command in directory
    const cwd = path.join(workspaceRoot, dev.cwd);
    if (!fs.existsSync(cwd)) {
      console.error(`ERROR: ${cwd} not found`);
      process.exit(1);
    }
    console.log(`Launching ${app} (dev)...`);
    const parts = dev.cmd.split(' ');
    const child = spawn(parts[0], parts.slice(1), { stdio: 'inherit', cwd, shell: true });
    child.on('exit', code => process.exit(code || 0));
    return;
  }

  console.error(`Invalid launcher config for ${app}`);
  process.exit(1);
}

module.exports = { run, parseArgs };
