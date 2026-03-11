'use strict';
const path = require('path');
const fs = require('fs');
const defaults = require('../lib/defaults');
const { generateConfig, writeConfigAtomic } = require('../lib/configGen');

function usage() {
  console.error('Usage: oceancode init');
  console.error('');
  console.error('Interactive wizard to generate oceancode.yaml');
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

  const { intro, outro, text, multiselect, confirm, isCancel, note } = require('@clack/prompts');
  const yaml = require('js-yaml');

  intro('oceancode init — workspace configuration wizard');

  const configPath = path.join(process.cwd(), 'oceancode.yaml');
  if (fs.existsSync(configPath)) {
    const overwrite = await confirm({ message: 'oceancode.yaml already exists. Overwrite?' });
    if (isCancel(overwrite) || !overwrite) {
      outro('Cancelled — no files written.');
      return;
    }
  }

  const prodPath = await text({
    message: 'Prod directory path (prod_root):',
    validate: (v) => {
      if (!v || v.trim() === '') return 'Path is required';
    },
  });
  if (isCancel(prodPath)) { outro('Cancelled.'); process.exit(0); }

  const selectedRepos = await multiselect({
    message: 'Select repos (Space to toggle, Enter to confirm):',
    options: defaults.repos.map(r => ({ value: r, label: r.name, hint: r.path })),
    initialValues: defaults.repos,
  });
  if (isCancel(selectedRepos)) { outro('Cancelled.'); process.exit(0); }

  // Filter build targets and launchers based on selected repos
  const selectedPaths = new Set(selectedRepos.map(r => r.path));
  const selectedNames = new Set(selectedRepos.map(r => r.name));
  const isRepoSelected = (t) =>
    selectedNames.has(t.name) || selectedPaths.has(t.path) ||
    [...selectedPaths].some(p => t.path.startsWith(p + '/'));

  const availableVenv = defaults.pythonVenvTargets.filter(isRepoSelected);
  const availableFrontend = defaults.frontendTargets.filter(isRepoSelected);
  const availableGo = defaults.goTargets.filter(isRepoSelected);
  const availableLaunchers = defaults.launchers.filter(l => selectedNames.has(l.name));

  let venvTargets = [];
  if (availableVenv.length > 0) {
    venvTargets = await multiselect({
      message: 'Python venv targets:',
      options: availableVenv.map(t => ({ value: t, label: t.name, hint: t.path })),
      initialValues: availableVenv,
      required: false,
    });
    if (isCancel(venvTargets)) { outro('Cancelled.'); process.exit(0); }
  }

  let frontendTargets = [];
  if (availableFrontend.length > 0) {
    frontendTargets = await multiselect({
      message: 'Frontend (npm) build targets:',
      options: availableFrontend.map(t => ({ value: t, label: t.name, hint: t.path })),
      initialValues: availableFrontend,
      required: false,
    });
    if (isCancel(frontendTargets)) { outro('Cancelled.'); process.exit(0); }
  }

  let goTargets = [];
  if (availableGo.length > 0) {
    goTargets = await multiselect({
      message: 'Go build targets:',
      options: availableGo.map(t => ({ value: t, label: t.name, hint: t.path })),
      initialValues: availableGo,
      required: false,
    });
    if (isCancel(goTargets)) { outro('Cancelled.'); process.exit(0); }
  }

  let launcherSelection = [];
  if (availableLaunchers.length > 0) {
    launcherSelection = await multiselect({
      message: 'Launchers:',
      options: availableLaunchers.map(l => ({ value: l, label: l.label, hint: l.name })),
      initialValues: availableLaunchers,
      required: false,
    });
    if (isCancel(launcherSelection)) { outro('Cancelled.'); process.exit(0); }
  }

  const pythonVersion = await text({
    message: 'Python version:',
    initialValue: '3.12',
  });
  if (isCancel(pythonVersion)) { outro('Cancelled.'); process.exit(0); }

  const config = generateConfig({
    prodRoot: prodPath,
    repos: selectedRepos,
    pythonVersion,
    venvTargets,
    frontendTargets,
    goTargets,
    launchers: launcherSelection,
  });

  // Preview single YAML
  note(yaml.dump(config, { lineWidth: -1 }), 'oceancode.yaml preview');

  const doWrite = await confirm({ message: 'Write oceancode.yaml?' });
  if (isCancel(doWrite) || !doWrite) {
    outro('Cancelled — no files written.');
    return;
  }

  writeConfigAtomic(configPath, config);
  console.log(`  Written: ${configPath}`);

  outro('Configuration complete!');
}

module.exports = { run, parseArgs };
