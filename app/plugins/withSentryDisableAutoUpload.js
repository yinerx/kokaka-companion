const fs = require("fs")
const path = require("path")
const { withDangerousMod } = require("expo/config-plugins")

// The @sentry/react-native plugin unconditionally adds "Upload Debug Symbols to
// Sentry" and source maps upload build phases. Those run `sentry-cli`, which
// fails the build unless an org/project/auth token is configured. We don't use
// Sentry uploads, so disable them via the env var the sentry scripts already
// respect. Writing to `.xcode.env` (rather than `.xcode.env.local`) makes this
// survive `expo prebuild --clean`, since it's re-applied on every prebuild.
const ENV_LINE = "export SENTRY_DISABLE_AUTO_UPLOAD=true"

const withSentryDisableAutoUpload = (config) =>
  withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const envPath = path.join(
        modConfig.modRequest.platformProjectRoot,
        ".xcode.env",
      )

      let env
      try {
        env = await fs.promises.readFile(envPath, "utf8")
      } catch {
        // `.xcode.env` not generated yet; nothing to patch.
        return modConfig
      }

      if (env.includes("SENTRY_DISABLE_AUTO_UPLOAD")) {
        return modConfig
      }

      const appended = env.endsWith("\n") ? env : `${env}\n`
      await fs.promises.writeFile(envPath, `${appended}${ENV_LINE}\n`)

      return modConfig
    },
  ])

module.exports = withSentryDisableAutoUpload
