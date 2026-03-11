'use strict';

const path = require('path');
const fs = require('fs-extra');
const micromatch = require('micromatch');

const SAFETY_NEGATIONS = [
  // Version control
  '.git/**',           '**/.git/**',
  // Python runtime/build
  '__pycache__/**',    '**/__pycache__/**',
  '*.pyc',             '**/*.pyc',
  '.venv/**',          '**/.venv/**',
  'venv-*/**',         '**/venv-*/**',
  '*.egg-info/**',     '**/*.egg-info/**',
  '.coverage',         '**/.coverage',
  'htmlcov/**',        '**/htmlcov/**',
  '.mypy_cache/**',    '**/.mypy_cache/**',
  '.pytest_cache/**',  '**/.pytest_cache/**',
  '.ruff_cache/**',    '**/.ruff_cache/**',
  // JS/Node
  'node_modules/**',   '**/node_modules/**',
  // Build output
  'dist/**',           '**/dist/**',
  '**/target/**',
  // IDE / tooling
  '.claude/**',        '**/.claude/**',
  '.cursor/**',        '**/.cursor/**',
  '.specdev/**',       '**/.specdev/**',
  '.serena/**',        '**/.serena/**',
  '.vscode/**',        '**/.vscode/**',
  '.apidoc/**',        '**/.apidoc/**',
  '.journal/**',       '**/.journal/**',
  '.obsidian/**',      '**/.obsidian/**',
  // OS / misc
  '.env',              '**/.env',
  '.DS_Store',         '**/.DS_Store',
  // sync_repo markers
  '.prodroot',
  '.prod_deletes',
];

function normalizePath(p) {
  let normalized = p.replace(/\\/g, '/');
  if (normalized.startsWith('./')) normalized = normalized.slice(2);
  return normalized;
}

async function parseProdinclude(rootDir) {
  const filePath = path.join(rootDir, '.prodinclude');
  if (!(await fs.pathExists(filePath))) {
    throw new Error(`.prodinclude not found in ${rootDir}`);
  }
  const content = await fs.readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  const includes = [];
  const negations = SAFETY_NEGATIONS.map(s => `!${s}`);

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('!')) {
      negations.push(line);
    } else {
      includes.push(line);
    }
  }

  return { includes, negations };
}

const MATCH_OPTS = { dot: true };

function isFileMatch(relPath, includes, negations) {
  if (!micromatch.isMatch(relPath, includes, MATCH_OPTS)) return false;
  const negPatterns = negations.map(n => n.slice(1));
  if (micromatch.isMatch(relPath, negPatterns, MATCH_OPTS)) return false;
  return true;
}

async function shouldSkipFile(srcPath, dstPath, force) {
  if (force) return false;
  if (!(await fs.pathExists(dstPath))) return false;
  const [srcStat, dstStat] = await Promise.all([fs.stat(srcPath), fs.stat(dstPath)]);
  // Compare at second precision — WSL2/cross-fs copies can lose sub-second timestamps
  return srcStat.size === dstStat.size
    && Math.floor(srcStat.mtimeMs / 1000) === Math.floor(dstStat.mtimeMs / 1000);
}

module.exports = {
  SAFETY_NEGATIONS,
  normalizePath,
  parseProdinclude,
  isFileMatch,
  shouldSkipFile,
};
