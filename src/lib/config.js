'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfig(configPath) {
  if (!configPath) {
    configPath = path.join(process.cwd(), 'sync_repos.yaml');
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`sync_repos.yaml not found at ${configPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    throw new Error(`Error parsing ${configPath}: ${e.message}`);
  }
  if (!doc || !doc.repos) {
    throw new Error(`sync_repos.yaml missing "repos" key`);
  }
  return doc;
}

function resolveRepos(config, repoArg) {
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

module.exports = { loadConfig, resolveRepos };
