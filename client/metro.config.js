// metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  // 새 경로를 웹 shim 으로 매핑
  "react-native/Libraries/Utilities/Platform":
    require.resolve("react-native-web/dist/exports/Platform"),
  "react-native/Libraries/ReactNative/UIManager":
    require.resolve("react-native-web/dist/exports/UIManager"),
  "react-native/Libraries/ReactNative/BridgelessUIManager":
    require.resolve("react-native-web/dist/exports/UIManager"),
};

module.exports = config;