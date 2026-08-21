module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Obrigatório na Reanimated 4: precisa ser o último plugin da lista.
    plugins: ['react-native-worklets/plugin'],
  };
};
