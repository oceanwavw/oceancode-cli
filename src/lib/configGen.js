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
  config.build = opts.buildModules || [];

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
