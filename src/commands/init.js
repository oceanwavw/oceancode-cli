'use strict';
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
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

  // Scan selected repos for oceancode.build.yaml to find buildable modules
  const selectedNames = new Set(selectedRepos.map(r => r.name));
  const buildableModules = [];
  for (const r of selectedRepos) {
    const buildYamlPath = path.resolve(process.cwd(), r.path, 'oceancode.build.yaml');
    if (fs.existsSync(buildYamlPath)) {
      let toolsHint = '';
      try {
        const doc = yaml.load(fs.readFileSync(buildYamlPath, 'utf8')) || {};
        if (Array.isArray(doc.tools) && doc.tools.length > 0) {
          toolsHint = `tools: ${doc.tools.join(', ')}`;
        }
      } catch { /* skip unreadable yaml */ }
      buildableModules.push({ name: r.name, hint: toolsHint || r.path });
    }
  }

  let buildModules = [];
  if (buildableModules.length > 0) {
    buildModules = await multiselect({
      message: 'Select modules to build:',
      options: buildableModules.map(m => ({ value: m.name, label: m.name, hint: m.hint })),
      initialValues: buildableModules.map(m => m.name),
      required: false,
    });
    if (isCancel(buildModules)) { outro('Cancelled.'); process.exit(0); }
  }

  const availableLaunchers = defaults.launchers.filter(l => selectedNames.has(l.name));

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

  const config = generateConfig({
    prodRoot: prodPath,
    repos: selectedRepos,
    buildModules,
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
