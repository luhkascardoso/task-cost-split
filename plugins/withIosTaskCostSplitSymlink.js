/**
 * iOS workarounds for this repo:
 *
 * 1) Expo prebuild bug https://github.com/expo/expo/issues/44338
 *    Folder renamed to TaskCostSplit but pbxproj still references HelloWorld/*.
 *    Symlink HelloWorld → real source dir.
 *
 * 2) Same bug / template leftover: PRODUCT_BUNDLE_IDENTIFIER stays as
 *    org.name.* instead of app.json ios.bundleIdentifier (needed by Maestro appId).
 *
 * 3) Project lives under ~/Documents (iCloud File Provider). ExpoModulesJSI builds
 *    into node_modules/.../apple/.DerivedData; iCloud stamps com.apple.FinderInfo
 *    and codesign fails with "resource fork, Finder information, or similar
 *    detritus not allowed". Build under ~/Library/Caches and sync Products back.
 */
const { withDangerousMod, withPodfile, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const JSI_BUILD_MARKER = 'task-cost-split-expo-modules-jsi';

const JSI_BUILD_PHASE_RUBY = `
    # task-cost-split: ExpoModulesJSI outside iCloud Documents (codesign / xattr)
    installer.pods_project.targets.each do |target|
      next unless target.name == 'ExpoModulesJSI'
      target.build_phases.each do |phase|
        next unless phase.respond_to?(:name) && phase.name == '[CP-User] Build ExpoModulesJSI xcframework'
        phase.shell_script = <<~'JSI_SCRIPT'
          set -e
          export EXPO_CUSTOM_BUILD_ROOT="$HOME/Library/Caches/${JSI_BUILD_MARKER}"
          mkdir -p "$EXPO_CUSTOM_BUILD_ROOT"
          "\${PODS_TARGET_SRCROOT}/scripts/build-xcframework.sh"
          mkdir -p "\${PODS_TARGET_SRCROOT}/Products"
          rsync -a --delete "$EXPO_CUSTOM_BUILD_ROOT/Products/" "\${PODS_TARGET_SRCROOT}/Products/"
          xattr -cr "\${PODS_TARGET_SRCROOT}/Products" 2>/dev/null || true
        JSI_SCRIPT
      end
    end
`.replaceAll('${JSI_BUILD_MARKER}', JSI_BUILD_MARKER);

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withIosHelloWorldSymlink(config) {
  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosDir = path.join(modConfig.modRequest.projectRoot, 'ios');
      const helloWorldPath = path.join(iosDir, 'HelloWorld');

      if (!fs.existsSync(helloWorldPath)) {
        const skip = new Set(['Pods', 'build', 'HelloWorld']);
        const sourceDir = fs
          .readdirSync(iosDir, { withFileTypes: true })
          .find(
            (e) =>
              e.isDirectory() &&
              !skip.has(e.name) &&
              !e.name.endsWith('.xcodeproj') &&
              !e.name.endsWith('.xcworkspace'),
          );

        if (sourceDir) {
          fs.symlinkSync(sourceDir.name, helloWorldPath);
        }
      }

      return modConfig;
    },
  ]);
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withExpoModulesJsiICloudSafeBuild(config) {
  return withPodfile(config, (modConfig) => {
    let contents = modConfig.modResults.contents;
    if (contents.includes(JSI_BUILD_MARKER)) {
      return modConfig;
    }

    if (!contents.includes('react_native_post_install(')) {
      return modConfig;
    }

    // Inject after react_native_post_install(...) block closes (the `)` line before `end`).
    contents = contents.replace(
      /(react_native_post_install\([\s\S]*?\n\s*\))\n(\s*end\nend)/,
      `$1\n${JSI_BUILD_PHASE_RUBY}$2`,
    );

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withCorrectBundleIdentifier(config) {
  return withXcodeProject(config, (modConfig) => {
    const bundleId = modConfig.ios?.bundleIdentifier;
    if (!bundleId) return modConfig;

    const project = modConfig.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const entry = configurations[key];
      if (typeof entry !== 'object' || !entry.buildSettings) continue;
      if (entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER = bundleId;
      }
    }
    return modConfig;
  });
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
function withIosWorkarounds(config) {
  config = withIosHelloWorldSymlink(config);
  config = withCorrectBundleIdentifier(config);
  config = withExpoModulesJsiICloudSafeBuild(config);
  return config;
}

module.exports = withIosWorkarounds;
