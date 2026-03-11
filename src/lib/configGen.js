'use strict';
const fs = require('fs');
const yaml = require('js-yaml');
const defaults = require('./defaults');

function generateConfig(opts) {
  const config = {};

  // Workspace section
  config.workspace = { prod_root: opts.prodRoot };

  // Repos section
  config.repos = {};
  for (const r of opts.repos || []) {
    config.repos[r.name] = r.path;
  }

  // Build section
  config.build = {};
  config.build.python_version = opts.pythonVersion || '3.12';
  config.build.venv = {};
  for (const t of opts.venvTargets || []) {
    config.build.venv[t.name] = {
      path: t.path,
      dir: { linux: 'venv-linux', macos: 'venv-linux', windows: 'venv-windows' },
    };
  }
  config.build.pypi_deps = defaults.pypiDeps;
  config.build.local_packages = [];
  for (const r of opts.repos || []) {
    config.build.local_packages.push({ name: r.name, path: r.path });
  }
  config.build.frontends = [];
  for (const f of opts.frontendTargets || []) {
    config.build.frontends.push({ name: f.name, path: f.path, verify: 'dist' });
  }
  config.build.cli_tools = [];
  for (const g of opts.goTargets || []) {
    config.build.cli_tools.push({ name: g.name, path: g.path, type: 'go' });
  }
  config.build.preflight_tools = defaults.preflightTools;
  config.build.tool_install = defaults.toolInstall;

  // Launchers section (top level)
  config.launchers = {};
  for (const l of opts.launchers || []) {
    const lc = defaults.launcherConfigs[l.name];
    if (lc) config.launchers[l.name] = lc;
  }

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

module.exports = { generateConfig, writeConfigAtomic };
