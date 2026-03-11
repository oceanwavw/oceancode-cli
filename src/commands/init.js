'use strict';
const path = require('path');
const fs = require('fs');
const defaults = require('../lib/defaults');
const { generateSyncConfig, generateBuildConfig, writeConfigAtomic } = require('../lib/configGen');

function usage() {
  console.error('Usage: oceancode init');
  console.error('');
  console.error('Interactive wizard to generate sync_repos.yaml and build.yaml');
  process.exit(1);
}

function parseArgs(args) {
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') usage();
  }
  return { flags };
}

async function run(args) {
  parseArgs(args);

  if (!process.stdin.isTTY) {
    console.error('Error: oceancode init requires an interactive terminal.');
    console.error('Run it directly in a terminal, not piped or in CI.');
    process.exit(1);
  }

  const { intro, outro, text, multiselect, confirm, isCancel } = require('@clack/prompts');

  intro('oceancode init — workspace configuration wizard');

  const workspaceRoot = await text({
    message: 'Dev workspace root:',
    initialValue: process.cwd(),
    validate: (v) => {
      if (!fs.existsSync(v)) return 'Directory does not exist';
    },
  });
  if (isCancel(workspaceRoot)) { outro('Cancelled.'); process.exit(0); }

  const prodPath = await text({
    message: 'Prod directory path:',
    validate: (v) => {
      if (!v || v.trim() === '') return 'Path is required';
    },
  });
  if (isCancel(prodPath)) { outro('Cancelled.'); process.exit(0); }

  let writeSyncConfig = false;
  let syncRepos = [];

  const doSync = await confirm({ message: 'Configure sync repos (sync_repos.yaml)?' });
  if (!isCancel(doSync) && doSync) {
    const syncPath = path.join(workspaceRoot, 'sync_repos.yaml');
    let proceed = true;
    if (fs.existsSync(syncPath)) {
      proceed = await confirm({ message: 'sync_repos.yaml already exists. Overwrite?' });
      if (isCancel(proceed)) proceed = false;
    }
    if (proceed) {
      syncRepos = await multiselect({
        message: 'Select repos to sync:',
        options: defaults.repos.map(r => ({ value: r, label: r.name, hint: r.path })),
        initialValues: defaults.repos,
      });
      if (!isCancel(syncRepos) && syncRepos.length > 0) {
        writeSyncConfig = true;
      } else if (!isCancel(syncRepos) && syncRepos.length === 0) {
        console.log('  Nothing selected, skipping sync config.');
      }
    }
  }

  let writeBuildConfig = false;
  let buildOpts = {};

  const doBuild = await confirm({ message: 'Configure build targets (build.yaml)?' });
  if (!isCancel(doBuild) && doBuild) {
    const buildPath = path.join(workspaceRoot, 'build.yaml');
    let proceed = true;
    if (fs.existsSync(buildPath)) {
      proceed = await confirm({ message: 'build.yaml already exists. Overwrite?' });
      if (isCancel(proceed)) proceed = false;
    }
    if (proceed) {
      const pythonVersion = await text({
        message: 'Python version:',
        initialValue: '3.12',
      });
      if (isCancel(pythonVersion)) { outro('Cancelled.'); process.exit(0); }

      const venvTargets = await multiselect({
        message: 'Python venv targets:',
        options: defaults.pythonVenvTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.pythonVenvTargets,
      });
      if (isCancel(venvTargets)) { outro('Cancelled.'); process.exit(0); }

      const frontendTargets = await multiselect({
        message: 'Frontend (npm) build targets:',
        options: defaults.frontendTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.frontendTargets,
      });
      if (isCancel(frontendTargets)) { outro('Cancelled.'); process.exit(0); }

      const goTargets = await multiselect({
        message: 'Go build targets:',
        options: defaults.goTargets.map(t => ({ value: t, label: t.name, hint: t.path })),
        initialValues: defaults.goTargets,
      });
      if (isCancel(goTargets)) { outro('Cancelled.'); process.exit(0); }

      const launcherSelection = await multiselect({
        message: 'Launchers:',
        options: defaults.launchers.map(l => ({ value: l, label: l.label, hint: l.name })),
        initialValues: defaults.launchers,
      });
      if (isCancel(launcherSelection)) { outro('Cancelled.'); process.exit(0); }

      buildOpts = {
        pythonVersion,
        venvTargets,
        frontendTargets,
        goTargets,
        launchers: launcherSelection,
      };
      writeBuildConfig = true;
    }
  }

  if (!writeSyncConfig && !writeBuildConfig) {
    outro('Nothing to write. Run oceancode init again to configure.');
    return;
  }

  // Preview generated YAML
  const yaml = require('js-yaml');
  const { note } = require('@clack/prompts');
  let syncConfig, buildConfig;

  if (writeSyncConfig) {
    syncConfig = generateSyncConfig(syncRepos);
    note(yaml.dump(syncConfig, { lineWidth: -1 }), 'sync_repos.yaml preview');
  }

  if (writeBuildConfig) {
    buildConfig = generateBuildConfig(buildOpts);
    note(yaml.dump(buildConfig, { lineWidth: -1 }), 'build.yaml preview');
  }

  // Confirm before writing
  const doWrite = await confirm({ message: 'Write config files?' });
  if (isCancel(doWrite) || !doWrite) {
    outro('Cancelled — no files written.');
    return;
  }

  if (writeSyncConfig) {
    const syncPath = path.join(workspaceRoot, 'sync_repos.yaml');
    writeConfigAtomic(syncPath, syncConfig);
    console.log(`  Written: ${syncPath}`);
  }

  if (writeBuildConfig) {
    const buildPath = path.join(workspaceRoot, 'build.yaml');
    writeConfigAtomic(buildPath, buildConfig);
    console.log(`  Written: ${buildPath}`);
  }

  outro('Configuration complete!');
}

module.exports = { run, parseArgs };
