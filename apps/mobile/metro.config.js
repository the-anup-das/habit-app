const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
const exclusionList = require('metro-config/src/defaults/exclusionList');

config.resolver.blockList = exclusionList([
  /.*\/packages\/db\/src\/drivers\/web.*/,
  /.*\/node_modules\/@sqlite\.org\/sqlite-wasm\/.*/,
]);

// Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Allow hierarchical lookup for pnpm virtual store resolution
// config.resolver.disableHierarchicalLookup = true;

// Support package exports (needed for subpath exports like @chapter/db/drivers/native)
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = ['require', 'import', 'react-native'];

module.exports = config;
