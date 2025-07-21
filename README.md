# Rspack Toolchain

A collection of reusable GitHub Actions for building and distributing Rspack native bindings across multiple platforms.

## 📦 Actions

### 🔽 Download Rspack Binding

**Location**: [`download-rspack-binding/action.yml`](./download-rspack-binding/action.yml)

Downloads rspack binding artifacts from GitHub Actions workflow runs. Supports downloading either specific target bindings or all available bindings.

> **Note**: This action downloads artifacts with the `bindings-*` naming pattern because the build reusable workflow uploads compiled native bindings using this format (e.g., `bindings-x86_64-apple-darwin`, `bindings-aarch64-unknown-linux-gnu`).

#### Inputs

| Name     | Description                                                                                                      | Required | Default     |
| -------- | ---------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| `target` | Specific target to download (e.g., `x86_64-apple-darwin`). If not provided, downloads all `bindings-*` artifacts | No       | -           |
| `path`   | Destination path for downloaded artifacts                                                                        | No       | `artifacts` |

#### Usage

```yaml
# Download all binding artifacts
- uses: rspack-contrib/rspack-toolchain/download-rspack-binding@main
  with:
    path: artifacts

# Download specific target binding
- uses: rspack-contrib/rspack-toolchain/download-rspack-binding@main
  with:
    target: x86_64-apple-darwin
    path: artifacts
```

### 📋 Get NAPI Info

**Location**: [`get-napi-info/action.yml`](./get-napi-info/action.yml)

Extracts NAPI targets from `package.json` and generates a build matrix for cross-platform native module compilation. This action automatically configures the appropriate host runners and build commands for each target platform.

> **⚠️ Important**: If your `package.json` contains `napi.targets` that are not defined in the supported targets list below, the action will fail with an error. Please submit a pull request to add support for additional compilation targets if needed.

#### Inputs

| Name                 | Description                                                                                                                                          | Required | Default                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------- |
| `package-json-path`  | Path to binding package.json                                                                                                                         | No       | `crates/binding/package.json` |
| `napi-build-command` | Command to call napi build. You can pass `--release` to build optimized release binaries ([see all options](https://napi.rs/docs/cli/build#options)) | No       | `pnpm build`                  |

#### Outputs

| Name           | Description                                           |
| -------------- | ----------------------------------------------------- |
| `matrix`       | Generated build matrix for napi targets (JSON format) |
| `binding-path` | Path to directory containing `*.node` files           |
| `targets`      | List of napi targets (JSON array)                     |

#### Supported Targets

The action supports the following target platforms:

| Target                          | Host Runner      | Notes               |
| ------------------------------- | ---------------- | ------------------- |
| `x86_64-apple-darwin`           | `macos-latest`   | macOS Intel         |
| `aarch64-apple-darwin`          | `macos-latest`   | macOS Apple Silicon |
| `x86_64-pc-windows-msvc`        | `windows-latest` | Windows 64-bit      |
| `i686-pc-windows-msvc`          | `windows-latest` | Windows 32-bit      |
| `aarch64-pc-windows-msvc`       | `windows-latest` | Windows ARM64       |
| `x86_64-unknown-linux-gnu`      | `ubuntu-22.04`   | Linux x64 (GNU)     |
| `x86_64-unknown-linux-musl`     | `ubuntu-22.04`   | Linux x64 (musl)    |
| `aarch64-unknown-linux-gnu`     | `ubuntu-22.04`   | Linux ARM64 (GNU)   |
| `aarch64-unknown-linux-musl`    | `ubuntu-22.04`   | Linux ARM64 (musl)  |
| `armv7-unknown-linux-gnueabihf` | `ubuntu-22.04`   | Linux ARMv7         |
| `aarch64-linux-android`         | `ubuntu-22.04`   | Android ARM64       |
| `armv7-linux-androideabi`       | `ubuntu-22.04`   | Android ARMv7       |

#### Usage

```yaml
jobs:
  get-info:
    runs-on: ubuntu-latest
    outputs:
      matrix: ${{ steps.napi.outputs.matrix }}
      targets: ${{ steps.napi.outputs.targets }}
      binding-path: ${{ steps.napi.outputs.binding-path }}
    steps:
      - uses: actions/checkout@v4
      - id: napi
        uses: rspack-contrib/rspack-toolchain/get-napi-info@main
        with:
          package-json-path: packages/binding/package.json
          napi-build-command: npm run build

  build:
    needs: get-info
    strategy:
      matrix: ${{ fromJSON(needs.get-info.outputs.matrix) }}
    runs-on: ${{ matrix.settings.host }}
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: ${{ matrix.settings.build }}
```

## 🔄 Reusable Workflows

### 🏗️ Build Workflow

**Location**: [`.github/workflows/build.yml`](./.github/workflows/build.yml)

A reusable workflow that automatically builds native bindings for all platforms specified in your `package.json`. This workflow:

1. Extracts NAPI targets from your `package.json`
2. Generates a build matrix for cross-platform compilation
3. Sets up the appropriate toolchain for each target platform
4. Builds native bindings in parallel across different runners
5. Uploads artifacts with the `bindings-*` naming pattern

#### Inputs

| Name                 | Description                                                                                                                                                                                        | Required | Default                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------- |
| `package-json-path`  | Path to binding `package.json`. Same as `--package-json-path` in `@napi-rs/cli build`                                                                                                              | No       | `crates/binding/package.json` |
| `napi-build-command` | Command to call `napi build`. Use as alias to build napi binding package. You can pass `--release` to build optimized release binaries ([see all options](https://napi.rs/docs/cli/build#options)) | No       | `pnpm build`                  |

#### Usage

```yaml
jobs:
  build:
    name: Build
    uses: rspack-contrib/rspack-toolchain/.github/workflows/build.yml@main
    with:
      package-json-path: crates/binding/package.json
      napi-build-command: pnpm build --release
```

## 🔧 Package.json Configuration

For the `get-napi-info` action to work properly, your `package.json` should include a `napi.targets` array:

```json
{
  "napi": {
    "targets": [
      "x86_64-apple-darwin",
      "aarch64-apple-darwin",
      "x86_64-pc-windows-msvc",
      "x86_64-unknown-linux-gnu"
    ]
  }
}
```

## 🚀 Complete Workflow Example

Here's a complete workflow example showing how to use the reusable build workflow with the actions for a release process:

[release.yml](https://github.com/rspack-contrib/rspack-binding-template/blob/main/.github/workflows/release.yml)

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
