'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { validateDev2Prod, validateProd2Dev } = require('../lib/guards');

describe('validateDev2Prod', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('passes when dev has .prodinclude and prod has .prodroot', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await assert.doesNotReject(() => validateDev2Prod(devDir, prodDir));
  });

  test('passes when dev has .prodinclude and prod is empty (new)', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.doesNotReject(() => validateDev2Prod(devDir, prodDir));
  });

  test('fails when dev is missing .prodinclude', async () => {
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /\.prodinclude/);
  });

  test('fails when dev has .prodroot (reversed)', async () => {
    await fs.writeFile(path.join(devDir, '.prodroot'), '');
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /prod folder/);
  });

  test('fails when prod has .prodinclude (reversed)', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await fs.writeFile(path.join(prodDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /dev folder/);
  });

  test('passes when prod path does not exist yet (new)', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    const newProdDir = path.join(os.tmpdir(), 'nonexistent-prod-' + Date.now());
    await assert.doesNotReject(() => validateDev2Prod(devDir, newProdDir));
  });

  test('fails when prod is non-empty and has no .prodroot', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await fs.outputFile(path.join(prodDir, 'some_file.txt'), 'data');
    await assert.rejects(() => validateDev2Prod(devDir, prodDir), /not empty/);
  });
});

describe('validateProd2Dev', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('passes when prod has .prodroot and dev has .prodinclude', async () => {
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.doesNotReject(() => validateProd2Dev(devDir, prodDir));
  });

  test('fails when prod missing .prodroot', async () => {
    await fs.writeFile(path.join(devDir, '.prodinclude'), 'src/**');
    await assert.rejects(() => validateProd2Dev(devDir, prodDir), /\.prodroot/);
  });
});
