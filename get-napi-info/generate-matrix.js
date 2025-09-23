const fs = require("node:fs");
const path = require("node:path");

/**
 * Get platform configuration for a given target
 * @param {string} target - The target platform string
 * @param {string} napiBuildCommand - The napi build command
 * @returns {object|null} Platform configuration object or null if unsupported
 */
function getPlatformConfig(target, napiBuildCommand) {
  const configs = {
    "x86_64-apple-darwin": {
      host: "macos-latest",
      target: "x86_64-apple-darwin",
      build: `${napiBuildCommand} --target x86_64-apple-darwin`
    },
    "x86_64-pc-windows-msvc": {
      host: "windows-latest",
      target: "x86_64-pc-windows-msvc",
      build: `${napiBuildCommand} --target x86_64-pc-windows-msvc`
    },
    "i686-pc-windows-msvc": {
      host: "windows-latest",
      target: "i686-pc-windows-msvc",
      build: `${napiBuildCommand} --target i686-pc-windows-msvc`
    },
    "x86_64-unknown-linux-gnu": {
      host: "ubuntu-22.04",
      target: "x86_64-unknown-linux-gnu",
      build: `${napiBuildCommand} --target x86_64-unknown-linux-gnu --use-napi-cross`
    },
    "x86_64-unknown-linux-musl": {
      host: "ubuntu-22.04",
      target: "x86_64-unknown-linux-musl",
      build: `${napiBuildCommand} --target x86_64-unknown-linux-musl -x`
    },
    "aarch64-apple-darwin": {
      host: "macos-latest",
      target: "aarch64-apple-darwin",
      build: `${napiBuildCommand} --target aarch64-apple-darwin`
    },
    "aarch64-unknown-linux-gnu": {
      host: "ubuntu-22.04",
      target: "aarch64-unknown-linux-gnu",
      build: `${napiBuildCommand} --target aarch64-unknown-linux-gnu --use-cross`
    },
    "armv7-unknown-linux-gnueabihf": {
      host: "ubuntu-22.04",
      target: "armv7-unknown-linux-gnueabihf",
      build: `${napiBuildCommand} --target armv7-unknown-linux-gnueabihf --use-cross`
    },
    "aarch64-linux-android": {
      host: "ubuntu-22.04",
      target: "aarch64-linux-android",
      build: `${napiBuildCommand} --target aarch64-linux-android`
    },
    "armv7-linux-androideabi": {
      host: "ubuntu-22.04",
      target: "armv7-linux-androideabi",
      build: `${napiBuildCommand} --target armv7-linux-androideabi`
    },
    "aarch64-unknown-linux-musl": {
      host: "ubuntu-22.04",
      target: "aarch64-unknown-linux-musl",
      build: `${napiBuildCommand} --target aarch64-unknown-linux-musl -x`
    },
    "aarch64-pc-windows-msvc": {
      host: "windows-latest",
      target: "aarch64-pc-windows-msvc",
      build: `${napiBuildCommand} --target aarch64-pc-windows-msvc`
    },
    "x86_64-unknown-freebsd": {
      host: "ubuntu-22.04",
      target: "x86_64-unknown-freebsd",
      build: `${napiBuildCommand} --target x86_64-unknown-freebsd --use-cross`
    },
    "aarch64-unknown-freebsd": {
      host: "ubuntu-22.04",
      target: "aarch64-unknown-freebsd",
      build: `${napiBuildCommand} --target aarch64-unknown-freebsd --use-cross -- -Zbuild-std=core,std,alloc,proc_macro,panic_abort`
    },
    "riscv64gc-unknown-linux-gnu": {
      host: "ubuntu-22.04",
      target: "riscv64gc-unknown-linux-gnu",
      build: `${napiBuildCommand} --target riscv64gc-unknown-linux-gnu --use-cross`
    },
    "riscv64gc-unknown-linux-musl": {
      host: "ubuntu-22.04",
      target: "riscv64gc-unknown-linux-musl",
      build: `${napiBuildCommand} --target riscv64gc-unknown-linux-musl --use-cross`
    }
  };

  return configs[target] || null;
}

/**
 * Main action function to generate build matrix
 * @param {object} params - Parameters object
 * @param {object} params.core - GitHub Actions core object
 * @param {string} params.packageJsonPath - Path to package.json
 * @param {string} params.napiBuildCommand - NAPI build command
 */
module.exports = async function action({ core, packageJsonPath, napiBuildCommand }) {
  try {
    // Check if package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Error: ${packageJsonPath} not found`);
    }

    console.log(`Reading package.json from: ${packageJsonPath}`);

    // Read and parse package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    // Extract napi.targets
    const napiTargets = packageJson?.napi?.targets;

    if (!napiTargets || !Array.isArray(napiTargets) || napiTargets.length === 0) {
      throw new Error("Error: No napi.targets found in package.json");
    }

    console.log(`Found ${napiTargets.length} targets`);
    console.log("Raw targets:", napiTargets);

    // Process targets and build matrix
    const matrixItems = [];
    const unsupportedTargets = [];

    for (const target of napiTargets) {
      // Clean target string
      const cleanTarget = target.trim().replace(/\r?\n|\r/g, '');

      console.log(`Processing target: '${cleanTarget}'`);

      const config = getPlatformConfig(cleanTarget, napiBuildCommand);

      if (config) {
        matrixItems.push(config);
        console.log(`✓ Added config for target: ${cleanTarget}`);
      } else {
        console.error(`✗ No config found for target: ${cleanTarget}`);
        unsupportedTargets.push(cleanTarget);
      }
    }

    // Check for unsupported targets
    if (unsupportedTargets.length > 0) {
      throw new Error(`Error: Unsupported targets found: ${unsupportedTargets.join(', ')}`);
    }

    // Generate matrix JSON
    const matrix = { settings: matrixItems };
    const matrixJson = JSON.stringify(matrix);

    console.log(`Generated matrix for ${matrixItems.length} targets`);
    console.log("Matrix:", matrixJson);

    // Set outputs
    core.setOutput('matrix', matrixJson);
    core.setOutput('targets', JSON.stringify(napiTargets));

    // Calculate binding directory
    const bindingDirectory = path.dirname(packageJsonPath);
    core.setOutput('binding-directory', bindingDirectory);
    console.log(`Binding directory: ${bindingDirectory}`);

  } catch (error) {
    console.error("Error generating build matrix:", error.message);
    core.setFailed(error.message);
    throw error;
  }
};