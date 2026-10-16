const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const CLASS_DECL = "class AppDelegate: ExpoAppDelegate {";
const WINDOW_START = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

function withSceneLifecycle(config) {
  config = withAppDelegate(config, cfg => {
    let contents = cfg.modResults.contents;
    if (contents.includes("ExpoReactNativeFactoryProvider")) return cfg;
    if (!contents.includes(CLASS_DECL) || !contents.includes(WINDOW_START)) {
      throw new Error("withSceneLifecycle: AppDelegate template mismatch");
    }
    contents = contents
      .replace(
        CLASS_DECL,
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      )
      .replace(WINDOW_START, "");
    cfg.modResults.contents = contents;
    return cfg;
  });

  return withInfoPlist(config, cfg => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "EXExpoAppSceneDelegate",
          },
        ],
      },
    };
    return cfg;
  });
}

module.exports = withSceneLifecycle;
