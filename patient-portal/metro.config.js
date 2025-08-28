const {getDefaultConfig} = require('metro-config');

module.exports = (async () => {
  const {
    resolver: {sourceExts, assetExts},
  } = await getDefaultConfig();
  
  return {
    transformer: {
      babelTransformerPath: require.resolve('metro-react-native-babel-transformer'),
      getTransformOptions: async () => ({
        transform: {
          experimentalImportSupport: false,
          inlineRequires: true,
        },
      }),
    },
    resolver: {
      assetExts: [...assetExts, 'bin', 'txt', 'jpg', 'png', 'json'],
      sourceExts: [...sourceExts, 'svg'],
    },
  };
})();