module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // O expo-router depende de react-native-reanimated, e a versão 4 do
      // reanimated compila suas animações através do react-native-worklets.
      // O babel-preset-expo não registra esse plugin sozinho: sem ele os
      // worklets não são transformados e a navegação falha em tempo de
      // execução — o app abre em tela branca.
      //
      // Precisa ser o último plugin da lista.
      'react-native-worklets/plugin',
    ],
  };
};
