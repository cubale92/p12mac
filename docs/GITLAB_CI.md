# Building P12 Retro on GitLab

The root `.gitlab-ci.yml` runs source, native C++ and Android integrity tests, then builds an Android APK on a Linux Docker runner. Branch pushes and merge requests run checks; a `vMAJOR.MINOR.PATCH` tag also publishes a GitLab Release. Duplicate branch pipelines are suppressed when a merge request is open.

Open **Build > Pipelines** to view runs and download job artifacts. Artifacts expire after 30 days. Tag releases upload their installers/APKs to the Generic Package Registry so release downloads do not depend on expiring job artifacts. The release contains Android plus whichever desktop jobs were enabled for that pipeline.

## Desktop runners

Windows builds are enabled by default using GitLab-hosted runners. macOS is disabled because this project currently has no matching Mac runner. The macOS hosted fleet requires an eligible Premium/Ultimate or open-source plan. Once access is available, set `P12_BUILD_MAC=true`; alternatively register an Apple Silicon runner in **Settings > CI/CD > Runners** and override the tag variable. No subscription changes are made by this pipeline.

| Platform | Enable variable | Default runner tag | Requirements |
| --- | --- | --- | --- |
| Windows x64 | `P12_BUILD_WINDOWS=true` | `saas-windows-medium-amd64` | PowerShell, Visual Studio 2022 Desktop C++, CMake 3.24+, Git, Node.js 20+, and a working NuGet PackageManagement provider; the job installs Inno Setup 6 with Chocolatey |
| macOS arm64 | `P12_BUILD_MAC=true` | `saas-macos-medium-m1` | `macos-15-xcode-16` image, Apple Silicon, Node.js 22; the job installs CMake with Homebrew if absent |

Override `P12_WINDOWS_RUNNER_TAG` or `P12_MAC_RUNNER_TAG` if your runners have different tags. A self-managed macOS shell runner ignores `image` and must have full Xcode, CMake and Node.js installed. A job without an eligible runner will remain pending and block the tag release. Set the corresponding `P12_BUILD_*` variable to `false` only if you intentionally want a release without that platform. Shell runners must be dedicated to trusted code. Protected runners only run on refs allowed by their protection settings.

The Linux jobs need outbound access to container registries, Google Android SDK downloads and Gradle/Maven repositories. GitLab-hosted runner usage depends on your account's available compute quota and verification status.

## Signing

Windows CI downloads Node.js 22.23.4 from nodejs.org, verifies its SHA-256 checksum and prepends it to PATH. It installs and loads electron-builder before any C++ compilation so runtime incompatibilities fail early. Completed native binaries are retained as job artifacts even if later installer packaging fails; a failed job does not imply a complete installer exists.

Add signing values under **Settings > CI/CD > Variables**, never in source files. Use masked/hidden values where supported and protect signing variables and release tags. Merge request builds without signing secrets produce a debug APK.

- Android: `P12_KEYSTORE_BASE64`, `P12_KEYSTORE_PASSWORD`, `P12_KEY_ALIAS`, `P12_KEY_PASSWORD`. The temporary keystore is deleted on job exit. Without these variables, the APK is explicitly named `P12-Retro-Android-debug.apk`. Ephemeral debug keys cannot reliably update earlier CI debug installations; use a permanent release key for distribution. The original Android 1.0.9 key is still missing as documented in `android/READ-ME-SIGNING-KEY-MISSING.txt`.
- macOS: `MAC_APP_SIGN_ID` and `MAC_INSTALLER_SIGN_ID`, with matching certificates/private keys already installed in the runner's unlocked keychain. This workflow does not add notarization.

## Publishing

Merge the CI changes, then create a tag such as `v1.0.1` on the desired commit. Only tags exactly matching `vMAJOR.MINOR.PATCH` publish releases. All enabled build jobs must succeed first. The release job uses GitLab's short-lived `CI_JOB_TOKEN` through `GLAB_ENABLE_CI_AUTOLOGIN`; no personal access token is required.

The existing GitHub Actions workflow is retained for GitHub mirrors. Original desktop icon files omitted from the exported working tree have been restored from the supplied archive's Git object history; the integrated preflight continues to check them.

References: [GitLab CI YAML](https://docs.gitlab.com/ci/yaml/), [GitLab release CLI](https://docs.gitlab.com/cli/release/create/), [GitLab runners](https://docs.gitlab.com/ci/runners/).
