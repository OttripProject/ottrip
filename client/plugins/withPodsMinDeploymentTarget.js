const { withDangerousMod } = require("expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

const MARKER = "# withPodsMinDeploymentTarget";

function withPodsMinDeploymentTarget(config, { minTarget = "15.1" } = {}) {
  return withDangerousMod(config, [
    "ios",
    async cfg => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        "Podfile",
      );
      const podfile = fs.readFileSync(podfilePath, "utf8");
      if (podfile.includes(MARKER)) return cfg;

      const snippet = [
        `    ${MARKER}`,
        "    installer.pods_project.targets.each do |target|",
        "      target.build_configurations.each do |build_config|",
        "        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
        `        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${minTarget}')`,
        `          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${minTarget}'`,
        "        end",
        "      end",
        "    end",
      ].join("\n");

      const anchor = "  post_install do |installer|\n";
      if (!podfile.includes(anchor)) {
        throw new Error(
          "withPodsMinDeploymentTarget: post_install block not found in Podfile",
        );
      }
      fs.writeFileSync(
        podfilePath,
        podfile.replace(anchor, `${anchor}${snippet}\n`),
      );
      return cfg;
    },
  ]);
}

module.exports = withPodsMinDeploymentTarget;
