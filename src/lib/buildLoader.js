'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const KNOWN_KEYS = ['tools', 'steps'];

function loadBuildYaml(moduleDir, moduleName) {
  const filePath = path.join(moduleDir, 'oceancode.build.yaml');
  if (!fs.existsSync(filePath)) {
    throw new Error(`oceancode.build.yaml not found in ${moduleDir} for module '${moduleName}'`);
  }
  const doc = yaml.load(fs.readFileSync(filePath, 'utf8')) || {};

  // Warn on unknown keys
  for (const key of Object.keys(doc)) {
    if (!KNOWN_KEYS.includes(key)) {
      console.warn(`Warning: unknown key '${key}' in oceancode.build.yaml for '${moduleName}'`);
    }
  }

  // Validate tools
  if (!Array.isArray(doc.tools)) {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'tools' must be an array`);
  }

  // Validate steps
  if (doc.steps === undefined || doc.steps === null) {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'steps' is required`);
  }
  if (Array.isArray(doc.steps)) {
    doc.steps.forEach((s, i) => {
      if (typeof s !== 'string' || s.trim() === '') {
        throw new Error(`oceancode.build.yaml in ${moduleName}: empty step at index ${i}`);
      }
    });
  } else if (typeof doc.steps === 'object') {
    for (const [platform, list] of Object.entries(doc.steps)) {
      if (!Array.isArray(list)) {
        throw new Error(`oceancode.build.yaml in ${moduleName}: steps.${platform} must be an array`);
      }
      list.forEach((s, i) => {
        if (typeof s !== 'string' || s.trim() === '') {
          throw new Error(`oceancode.build.yaml in ${moduleName}: empty step at steps.${platform}[${i}]`);
        }
      });
    }
  } else {
    throw new Error(`oceancode.build.yaml in ${moduleName}: 'steps' must be an array or platform-keyed object`);
  }

  return doc;
}

function resolveSteps(steps, platform, moduleName) {
  if (Array.isArray(steps)) return steps;
  if (platform in steps) return steps[platform];
  return null;
}

function validateBuildList(buildList) {
  const seen = new Set();
  buildList.forEach((entry, i) => {
    if (typeof entry !== 'string' || entry.trim() === '') {
      throw new Error(`Invalid build entry at index ${i}: must be a non-empty string`);
    }
    if (seen.has(entry)) {
      throw new Error(`Duplicate build module '${entry}' in oceancode.yaml`);
    }
    seen.add(entry);
  });
}

module.exports = { loadBuildYaml, resolveSteps, validateBuildList };
