'use strict';

const path = require('path');
const fs = require('fs-extra');
const { dev2prod } = require('./dev2prod');

async function batch(flags) {
  const configPath = flags.config || path.join(__dirname, '..', 'sync_repos.json');
  const config = JSON.parse(await fs.readFile(configPath, 'utf8'));

  const listPath = flags.list;
  if (!listPath) {
    const err = new Error('batch requires --list <file>');
    err.isValidation = true;
    throw err;
  }

  const listContent = await fs.readFile(listPath, 'utf8');
  const repoNames = listContent
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));

  if (repoNames.length === 0) {
    console.log('No repos listed in sync list. Nothing to do.');
    return 0;
  }

  // Validate all repo names before starting
  const unknown = repoNames.filter(n => !config.repos[n]);
  if (unknown.length > 0) {
    const err = new Error(`Unknown repos in sync list: ${unknown.join(', ')}`);
    err.isValidation = true;
    throw err;
  }

  const source = path.resolve(config.source);
  const target = path.resolve(config.target);
  let failed = 0;

  for (let i = 0; i < repoNames.length; i++) {
    const name = repoNames[i];
    const repo = config.repos[name];
    const devDir = path.join(source, repo.path);
    const prodDir = path.join(target, repo.path);

    console.log(`\n[${i + 1}/${repoNames.length}] ${name}`);

    try {
      const code = await dev2prod({
        dev: devDir,
        prod: prodDir,
        mirror: flags.mirror,
        force: flags.force,
        dryRun: flags.dryRun,
        verbose: flags.verbose,
      });
      if (code !== 0) failed++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(` Batch complete: ${repoNames.length - failed}/${repoNames.length} succeeded`);
  if (failed > 0) console.log(` ${failed} failed`);
  console.log(`========================================`);

  return failed > 0 ? 2 : 0;
}

module.exports = { batch };
