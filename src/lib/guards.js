'use strict';

const path = require('path');
const fs = require('fs-extra');

async function validateDev2Prod(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const devHasProdroot = await fs.pathExists(path.join(devDir, '.prodroot'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));

  if (devHasProdroot) {
    const err = new Error(`--dev path "${devDir}" contains .prodroot — this looks like a prod folder. Did you mean prod2dev?`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude) {
    const err = new Error(`--dev path "${devDir}" is missing .prodinclude. Create one to define which files ship to prod.`);
    err.isValidation = true;
    throw err;
  }
  // Prod must have .prodroot, be empty, or not exist yet (new)
  if (!prodHasProdroot) {
    const prodExists = await fs.pathExists(prodDir);
    if (prodExists) {
      const entries = await fs.readdir(prodDir);
      if (entries.length > 0) {
        const err = new Error(`--prod path "${prodDir}" is not empty and has no .prodroot marker. This may not be a prod folder. Run dev2prod on an empty directory first, or add a .prodroot file manually.`);
        err.isValidation = true;
        throw err;
      }
    }
  }
}

async function validateProd2Dev(devDir, prodDir) {
  const devHasProdinclude = await fs.pathExists(path.join(devDir, '.prodinclude'));
  const prodHasProdinclude = await fs.pathExists(path.join(prodDir, '.prodinclude'));
  const prodHasProdroot = await fs.pathExists(path.join(prodDir, '.prodroot'));

  if (!prodHasProdroot) {
    const err = new Error(`--prod path "${prodDir}" is missing .prodroot. Is this a prod folder? Run dev2prod first to initialize it.`);
    err.isValidation = true;
    throw err;
  }
  if (!devHasProdinclude && !prodHasProdinclude) {
    const err = new Error(`No .prodinclude found in dev or prod. Create one to define which files to sync.`);
    err.isValidation = true;
    throw err;
  }
}

module.exports = { validateDev2Prod, validateProd2Dev };
