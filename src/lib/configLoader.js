'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!configPath) {
    configPath = path.join(process.cwd(), 'oceancode.yaml');
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`oceancode.yaml not found at ${configPath}. Run from your dev workspace root, or pass --config`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  return doc || {};
}

function requireSection(config, dotPath) {
  const parts = dotPath.split('.');
  let current = config;
  for (const part of parts) {
    if (!current || current[part] === undefined) {
      throw new Error(`Missing config section '${dotPath}'. Run 'oceancode init' to generate oceancode.yaml.`);
    }
    current = current[part];
  }
}

function resolveRepos(config, repoArg) {
  if (!config.repos) {
    throw new Error(`Missing config section 'repos'. Run 'oceancode init' to generate oceancode.yaml.`);
  }
  if (!repoArg) {
    return Object.entries(config.repos).map(([name, rel]) => ({ name, path: rel }));
  }
  const names = repoArg.split(',').map(n => n.trim()).filter(Boolean);
  const unknown = names.filter(n => !config.repos[n]);
  if (unknown.length > 0) {
    throw new Error(`Unknown repos: ${unknown.join(', ')}`);
  }
  return names.map(name => ({ name, path: config.repos[name] }));
}

module.exports = { loadConfig, requireSection, resolveRepos };
