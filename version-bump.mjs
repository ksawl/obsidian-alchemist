import { readFileSync, writeFileSync } from 'fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
const { version, minAppVersion } = manifest;

// 1. Update package.json
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
pkg.version = version;
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

// 2. Update versions.json
const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
versions[version] = minAppVersion;
writeFileSync('versions.json', JSON.stringify(versions, null, 2) + '\n');

console.log(`Version bumped to ${version} in all configuration files.`);
