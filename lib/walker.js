'use strict';

const path = require('path');
const fs = require('fs-extra');
const micromatch = require('micromatch');
const { normalizePath } = require('./shared');

async function walkTree(rootDir, prunePatterns) {
  const results = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = normalizePath(path.relative(rootDir, fullPath));

      if (prunePatterns) {
        if (entry.isDirectory()) {
          const dirPath = relPath + '/';
          if (micromatch.isMatch(dirPath, prunePatterns) || micromatch.isMatch(relPath, prunePatterns)) {
            continue;
          }
        } else {
          if (micromatch.isMatch(relPath, prunePatterns)) {
            continue;
          }
        }
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        results.push(relPath);
      }
    }
  }

  await walk(rootDir);
  return results.sort();
}

module.exports = { walkTree };
