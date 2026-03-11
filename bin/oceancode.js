#!/usr/bin/env node
'use strict';

const path = require('path');

const GROUPS = {
  sync: path.join(__dirname, '..', 'src', 'commands', 'sync'),
  'git-dev': path.join(__dirname, '..', 'src', 'commands', 'git-dev'),
  'git-prod': path.join(__dirname, '..', 'src', 'commands', 'git-prod'),
  'clone-prod': path.join(__dirname, '..', 'src', 'commands', 'clone-prod'),
  build: path.join(__dirname, '..', 'src', 'commands', 'build'),
  launch: path.join(__dirname, '..', 'src', 'commands', 'launch'),
  init: path.join(__dirname, '..', 'src', 'commands', 'init'),
};

const group = process.argv[2];
if (!group || !GROUPS[group]) {
  console.error('Usage: oceancode <sync|git-dev|git-prod|clone-prod|build|launch|init> [action] [args] [flags]');
  console.error('');
  console.error('Command groups:');
  console.error('  sync       Sync repos between dev and prod');
  console.error('  git-dev    Git status for dev repos');
  console.error('  git-prod   Git operations across prod repos');
  console.error('  clone-prod Clone repos into prod directory');
  console.error('  build      Build backend, frontend, and CLI packages');
  console.error('  launch     Launch applications (dev or prod mode)');
  console.error('  init       Interactive wizard to generate config files');
  process.exit(1);
}

require(GROUPS[group]).run(process.argv.slice(3));
