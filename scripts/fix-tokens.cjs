#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');

function listFiles(dir, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, results);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

let changed = 0;
for (const file of listFiles(srcDir)) {
  const text = fs.readFileSync(file, 'utf8');
  let out = text;
  out = out.replace(/\b_null\b/g, 'null');
  out = out.replace(/\b_Boolean\b/g, 'Boolean');
  out = out.replace(/import\.meta\._env/g, 'import.meta.env');
  if (out !== text) {
    fs.writeFileSync(file, out);
    changed++;
    console.log('Fixed:', path.relative(root, file));
  }
}
console.log(`\nUpdated ${changed} files.`);

