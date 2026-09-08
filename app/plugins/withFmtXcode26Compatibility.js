const fs = require("fs")
const path = require("path")
const { withDangerousMod } = require("expo/config-plugins")

// The SDK 52 Podfile had a "This is necessary for Xcode 14" comment block we
// used to anchor the insertion. SDK 54 removed that block, so we anchor on the
// `react_native_post_install(` call instead and inject the fmt fix as the first
// statement inside `post_install`.
const insertionMarker = "    react_native_post_install(\n"

const compatibilityBlock = `    # fmt does not compile as C++20 with Apple Clang in Xcode 26.5.
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'

      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
      end
    end

`

const withFmtXcode26Compatibility = (config) =>
  withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const podfilePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        "Podfile",
      )
      const podfile = await fs.promises.readFile(podfilePath, "utf8")

      if (podfile.includes("target.name == 'fmt'")) {
        return modConfig
      }

      if (!podfile.includes(insertionMarker)) {
        throw new Error("Unable to add the fmt Xcode compatibility setting")
      }

      await fs.promises.writeFile(
        podfilePath,
        podfile.replace(
          insertionMarker,
          `${compatibilityBlock}${insertionMarker}`,
        ),
      )

      return modConfig
    },
  ])

module.exports = withFmtXcode26Compatibility
