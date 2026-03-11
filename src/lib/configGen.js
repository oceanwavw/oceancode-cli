'use strict';
const fs = require('fs');
const yaml = require('js-yaml');
const defaults = require('./defaults');

function generateSyncConfig(selectedRepos) {
  const repos = {};
  for (const r of selectedRepos) {
    repos[r.name] = r.path;
  }
  return { repos };
}

function generateBuildConfig(opts) {
  const config = {};
  config.python_version = opts.pythonVersion || '3.12';

  config.venv = {};
  for (const t of opts.venvTargets || []) {
    config.venv[t.name] = {
      path: t.path,
      dir: { linux: 'venv-linux', macos: 'venv-linux', windows: 'venv-windows' },
    };
  }

  config.pypi_deps = defaults.pypiDeps;

  config.local_packages = [];
  for (const r of defaults.repos) {
    config.local_packages.push({ name: r.name, path: r.path });
  }

  config.frontends = [];
  for (const f of opts.frontendTargets || []) {
    config.frontends.push({ name: f.name, path: f.path, verify: 'dist' });
  }

  config.cli_tools = [];
  for (const g of opts.goTargets || []) {
    config.cli_tools.push({ name: g.name, path: g.path, type: 'go' });
  }

  config.launchers = {};
  for (const l of opts.launchers || []) {
    const lc = defaults.launcherConfigs[l.name];
    if (lc) config.launchers[l.name] = lc;
  }

  config.preflight_tools = defaults.preflightTools;
  config.tool_install = defaults.toolInstall;

  return config;
}

function writeConfigAtomic(filePath, data) {
  const content = yaml.dump(data, { lineWidth: -1, quotingType: '"' });
  const tmpPath = filePath + '.tmp';
  try {
    fs.writeFileSync(tmpPath, content, 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch {}
    throw e;
  }
}

module.exports = { generateSyncConfig, generateBuildConfig, writeConfigAtomic };
