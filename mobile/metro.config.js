const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/**
 * O contrato de dados e o conjunto fictício vivem em `../shared`, fora da raiz
 * do projeto Expo. O Metro só observa a própria pasta por padrão, então é
 * preciso declarar a pasta extra (`watchFolders`) e o apelido do pacote
 * (`extraNodeModules`) — sem os dois, `@fieldops/shared` não resolve.
 */
const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, '..', 'shared');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Aponta para `src` (e nao para a raiz) para que o subcaminho
  // `@fieldops/shared/domain` tambem resolva.
  '@fieldops/shared': path.resolve(sharedRoot, 'src'),
};

// A pasta compartilhada não tem `node_modules` própria: as dependências (que
// são só as de tipo) continuam sendo resolvidas a partir do projeto.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];

module.exports = config;
