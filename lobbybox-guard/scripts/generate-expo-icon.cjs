#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const assetRelativePath = path.join('assets', 'icon.png');
const assetSourcePath = path.join('assets', 'icon.base64.txt');
const projectRoot = path.resolve(__dirname, '..');
const targetPath = path.join(projectRoot, assetRelativePath);
const base64SourcePath = path.join(projectRoot, assetSourcePath);

function ensureIconAsset() {
  if (!fs.existsSync(base64SourcePath)) {
    console.warn(
      `Expo icon base64 source not found at ${base64SourcePath}. Skipping icon generation.`
    );
    return false;
  }

  const base64Data = fs.readFileSync(base64SourcePath, 'utf8').trim();

  if (!base64Data) {
    console.warn('Expo icon base64 source is empty. Skipping icon generation.');
    return false;
  }

  const outputDir = path.dirname(targetPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }

  const iconBuffer = Buffer.from(base64Data, 'base64');

  const existingBuffer = fs.existsSync(targetPath)
    ? fs.readFileSync(targetPath)
    : null;

  if (existingBuffer && Buffer.compare(existingBuffer, iconBuffer) === 0) {
    console.log(`Expo icon asset already generated at ${targetPath}.`);
    return true;
  }

  fs.writeFileSync(targetPath, iconBuffer);
  console.log(`Expo icon asset written to ${targetPath}.`);
  return true;
}

if (!ensureIconAsset()) {
  process.exitCode = 1;
}
