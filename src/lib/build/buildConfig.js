'use strict';

const fs = require('fs');
const yaml = require('js-yaml');

function loadBuildConfig(configPath, workspaceRoot) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`build.yaml not found at ${configPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  if (workspaceRoot) {
    validatePaths(doc, workspaceRoot);
  }
  return doc;
}

function validatePaths(config, workspaceRoot) {
  const path = require('path');
  const sections = [
    { key: 'local_packages', items: config.local_packages || [] },
    { key: 'frontends', items: config.frontends || [] },
    { key: 'cli_tools', items: config.cli_tools || [] },
  ];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.path) {
        const fullPath = path.join(workspaceRoot, item.path);
        if (!fs.existsSync(fullPath)) {
          console.warn(`WARNING: ${section.key}.${item.name} path not found: ${fullPath}`);
        }
      }
    }
  }
}

function resolveTarget(items, name) {
  if (!name) return items || [];
  const found = (items || []).filter(item => item.name === name);
  if (found.length === 0) {
    throw new Error(`Unknown target: ${name}`);
  }
  return found;
}

module.exports = { loadBuildConfig, resolveTarget };
