const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Extend the existing blockList with our custom exclusions
const extraExclusions = [
  /.*\/packages\/db\/src\/drivers\/web.*/,
  /.*\/node_modules\/@sqlite\.org\/sqlite-wasm\/.*/,
];

// Ensure blockList is an array and append our extra exclusions
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : (config.resolver.blockList ? [config.resolver.blockList] : [])),
  ...extraExclusions
];

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
