'use strict';

const path = require('path');
const fs = require('fs-extra');

async function validateDev2Prod(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const devHasProdroot = await fs.pathExists(path.join(devDir, '.prodroot'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));
  const prodHasProdinclude = await fs.pathExists(path.join(prodDir, '.prodinclude'));

  if (devHasProdroot) {
    const err = new Error(`--dev path "${devDir}" contains .prodroot — this looks like a prod folder. Did you mean prod2dev?`);
    err.isValidation = true;
    throw err;
  }
  if (prodHasProdinclude) {
    const err = new Error(`--prod path "${prodDir}" contains .prodinclude — this looks like a dev folder. Did you mean to swap --dev and --prod?`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude) {
    const err = new Error(`--dev path "${devDir}" is missing .prodinclude. Create one to define which files ship to prod.`);
    err.isValidation = true;
    throw err;
  }
}

async function validateProd2Dev(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));

  if (!prodHasProdroot) {
    const err = new Error(`--prod path "${prodDir}" is missing .prodroot. Is this a prod folder? Run dev2prod first to initialize it.`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude) {
    const err = new Error(`--dev path "${devDir}" is missing .prodinclude. Is this the dev folder?`);
    err.isValidation = true;
    throw err;
  }
}

module.exports = { validateDev2Prod, validateProd2Dev };
