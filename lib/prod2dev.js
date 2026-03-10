'use strict';

const path = require('path');
const fs = require('fs-extra');
const { SAFETY_NEGATIONS, parseProdinclude, isFileMatch, shouldSkipFile } = require('./shared');
const { walkTree } = require('./walker');
const { validateProd2Dev } = require('./guards');

async function prod2dev(flags) {
  const { dev, prod, force, dryRun, verbose } = flags;

  await validateProd2Dev(dev, prod);

  const prodFiles = await walkTree(prod, SAFETY_NEGATIONS);

  const toCopy = [];
  let skipped = 0;

  for (const relPath of prodFiles) {
    const srcPath = path.join(prod, relPath);
    const dstPath = path.join(dev, relPath);
    if (await shouldSkipFile(srcPath, dstPath, force)) {
      skipped++;
      if (verbose) console.log(`  SKIP    ${relPath} (unchanged)`);
      continue;
    }
    toCopy.push({ relPath, srcPath, dstPath });
  }

  const { includes, negations } = await parseProdinclude(dev);
  const devFiles = await walkTree(dev, SAFETY_NEGATIONS);
  const prodFileSet = new Set(prodFiles);
  const deleteCandidates = [];

  for (const relPath of devFiles) {
    if (!isFileMatch(relPath, includes, negations)) continue;
    if (!prodFileSet.has(relPath)) {
      deleteCandidates.push(relPath);
    }
  }

  if (verbose || dryRun) {
    for (const { relPath } of toCopy) {
      console.log(`  ${dryRun ? 'WOULD COPY' : 'COPY'}   ${relPath}`);
    }
  }

  if (dryRun) {
    console.log(`\n[DRY RUN] sync_repo prod2dev`);
    console.log(`  Would copy:       ${toCopy.length} files`);
    console.log(`  Skipped:          ${skipped} files (unchanged)`);
    console.log(`  Delete candidates: ${deleteCandidates.length} files`);
    if (deleteCandidates.length > 0) {
      console.log(`  Would write .prod_deletes with ${deleteCandidates.length} entries`);
    }
    return 0;
  }

  let errors = 0;
  for (const { relPath, srcPath, dstPath } of toCopy) {
    try {
      await fs.ensureDir(path.dirname(dstPath));
      await fs.copy(srcPath, dstPath, { preserveTimestamps: true });
    } catch (err) {
      console.error(`  ERROR copying ${relPath}: ${err.message}`);
      errors++;
    }
  }

  if (deleteCandidates.length > 0) {
    const deleteListPath = path.join(dev, '.prod_deletes');
    const content = [
      '# Files in dev (allowlisted) but missing from prod',
      '# Review this list, then run: node sync_repo.js prune --dev <path> --deletelist .prod_deletes',
      '# Remove lines for files you want to keep.',
      '',
      ...deleteCandidates,
      '',
    ].join('\n');
    await fs.writeFile(deleteListPath, content);
  }

  console.log(`\nsync_repo prod2dev complete`);
  console.log(`  Copied:            ${toCopy.length} files`);
  console.log(`  Skipped:           ${skipped} files (unchanged)`);
  console.log(`  Errors:            ${errors}`);
  if (deleteCandidates.length > 0) {
    console.log(`  Delete candidates: ${deleteCandidates.length} (written to .prod_deletes)`);
  }

  return errors > 0 ? 2 : 0;
}

module.exports = { prod2dev };
