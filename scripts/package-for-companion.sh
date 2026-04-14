#!/bin/bash

# Package VDCP module for Companion offline import
# Creates a .tgz with the structure expected by Companion's offline importer:
#   bundle/<module-id>-<version>/companion/manifest.json
#   bundle/<module-id>-<version>/src/...
#   bundle/<module-id>-<version>/node_modules/...
#   bundle/<module-id>-<version>/package.json

set -e
export COPYFILE_DISABLE=1

MODULE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$MODULE_DIR"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
MODULE_ID=$(node -p "require('./companion/manifest.json').id")
PACKAGE_NAME="${MODULE_ID}-${VERSION}.tgz"
TEMP_DIR=$(mktemp -d)
OUTER_DIR="bundle"
MODULE_SUBDIR="${MODULE_ID}-${VERSION}"

echo "📦 Packaging VDCP module v${VERSION} for Companion..."

# Create temp structure expected by Companion offline importer
mkdir -p "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR"

# Copy files to temp directory
echo "  Copying files..."
cp -r companion "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR/"
cp -r src "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR/"
cp -r node_modules "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR/"
cp package.json "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR/"
cp README.md "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR/" 2>/dev/null || true

# Sync manifest version to package version
echo "  Syncing manifest version..."
node -e "
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');
const manifestPath = path.join(process.argv[1], process.argv[2], process.argv[3], 'companion', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = pkg.version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, '\\t') + '\\n');
" "$TEMP_DIR" "$OUTER_DIR" "$MODULE_SUBDIR"

# Create minimal package.json for Companion
cd "$TEMP_DIR/$OUTER_DIR/$MODULE_SUBDIR"
node -e "
const pkg = require('./package.json');
const minimal = {
  name: pkg.name,
  version: pkg.version,
  license: pkg.license || 'MIT',
  type: 'commonjs',
  main: pkg.main,
  dependencies: pkg.dependencies || {}
};
require('fs').writeFileSync('package.json', JSON.stringify(minimal));
"

# Create tarball
echo "  Creating tarball..."
cd "$TEMP_DIR"
tar -czf "$MODULE_DIR/$PACKAGE_NAME" "$OUTER_DIR"/

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Package created: $PACKAGE_NAME"
echo ""
echo "File size: $(du -h "$MODULE_DIR/$PACKAGE_NAME" | cut -f1)"
echo ""
echo "Team members can import this through:"
echo "  Companion → Modules → Import Offline Module Package"
