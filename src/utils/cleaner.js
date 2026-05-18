const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const logger = require('./logger');
const { commandExists, execCommandSync } = require('./commands');

function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function isValidBundleId(bundleId) {
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(bundleId);
}

function removeFilesByPrefix(directory, prefixes) {
  if (!directory || !fs.existsSync(directory)) return;

  let entries = [];
  try {
    entries = fs.readdirSync(directory);
  } catch (e) {
    return;
  }

  for (const entry of entries) {
    if (!prefixes.some((prefix) => entry.startsWith(prefix))) continue;

    try {
      fs.removeSync(path.join(directory, entry));
    } catch (e) {
      // Ignore individual cache removal errors.
    }
  }
}

function tryExecFile(command, args, options = {}) {
  try {
    execCommandSync(command, args, options);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Kill running applications
 */
async function killRunningApps(bundleId, platform) {
  logger.step('Checking for running applications...');

  if (platform === 'android' || platform === 'all') {
    try {
      if (commandExists('adb')) {
        const devices = execCommandSync('adb', ['devices'], { encoding: 'utf8' });
        const deviceCount = (devices.match(/device$/gm) || []).length;

        if (deviceCount > 0 && bundleId) {
          try {
            if (isValidBundleId(bundleId)) {
              execCommandSync('adb', ['shell', 'am', 'force-stop', bundleId], { stdio: 'ignore' });
              logger.success('Stopped Android app');
            } else {
              logger.warning('Invalid bundle identifier, skipping Android app kill');
            }
          } catch (e) {
            logger.warning('App might not be running on device');
          }
        }
      }
    } catch (e) {
      logger.warning('ADB not available, skipping Android app kill');
    }
  }

  // Kill Metro bundler if running
  try {
    if (process.platform === 'darwin') {
      tryExecFile('pkill', ['-f', 'react-native'], { stdio: 'ignore' });
      tryExecFile('pkill', ['-f', 'metro'], { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      execSync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq *metro*" 2>nul || true', {
        stdio: 'ignore',
      });
    } else {
      tryExecFile('pkill', ['-f', 'react-native'], { stdio: 'ignore' });
      tryExecFile('pkill', ['-f', 'metro'], { stdio: 'ignore' });
    }
    logger.success('Killed running Metro/React Native processes');
  } catch (e) {
    // Ignore errors
  }
}

/**
 * Clean watchman cache
 */
async function cleanWatchman() {
  logger.step('Cleaning watchman cache...');
  try {
    if (commandExists('watchman')) {
      execCommandSync('watchman', ['watch-del-all'], { stdio: 'ignore' });
      logger.success('Watchman cache cleared');
    } else {
      logger.warning('Watchman not found, skipping...');
    }
  } catch (e) {
    logger.warning('Could not clean watchman cache');
  }
}

/**
 * Clean Metro and Expo caches
 */
async function cleanCaches() {
  logger.step('Clearing Metro bundler and Expo caches...');

  const tmpDir =
    process.env.TMPDIR ||
    process.env.TMP ||
    (process.platform === 'win32' ? process.env.TEMP : '/tmp');
  const homeDir = process.env.HOME || process.env.USERPROFILE;

  removeFilesByPrefix(tmpDir, ['metro-', 'haste-map-', 'react-', 'react-native-packager-cache-']);

  // Clear Expo cache in home directory
  const expoCachePath = path.join(homeDir, '.expo', 'metro-cache');
  if (fs.existsSync(expoCachePath)) {
    try {
      fs.removeSync(expoCachePath);
    } catch (e) {
      // Ignore errors
    }
  }

  // Clear .expo in project directory
  if (fs.existsSync('.expo')) {
    try {
      fs.removeSync('.expo');
    } catch (e) {
      // Ignore errors
    }
  }

  logger.success('All Metro and Expo caches cleared');
}

/**
 * Delete native folders
 */
async function deleteNativeFolders(platform) {
  logger.step('Removing native folders...');

  const foldersToRemove = [];

  if (platform === 'android' || platform === 'all') {
    foldersToRemove.push('android');
  }

  if (platform === 'ios' || platform === 'all') {
    foldersToRemove.push('ios');
  }

  for (const folder of foldersToRemove) {
    if (fs.existsSync(folder)) {
      fs.removeSync(folder);
      logger.success(`Removed ${folder}/ folder`);
    }
  }
}

/**
 * Clean node_modules and optionally lock files
 */
async function cleanDependencies() {
  logger.step('Removing node_modules...');

  if (fs.existsSync('node_modules')) {
    try {
      fs.removeSync('node_modules');
      // Verify it was removed
      if (!fs.existsSync('node_modules')) {
        logger.success('Removed node_modules');
      } else {
        throw new Error('node_modules still exists after removal attempt');
      }
    } catch (e) {
      // Fallback: try fs-extra
      logger.warning('Shell removal failed, trying alternative method...');
      try {
        fs.removeSync('node_modules');
        if (!fs.existsSync('node_modules')) {
          logger.success('Removed node_modules');
        } else {
          throw new Error('node_modules still exists');
        }
      } catch (e2) {
        logger.error('Could not remove node_modules. This might be due to:');
        logger.error('  - Files are locked by another process');
        logger.error('  - Permission issues');
        logger.error('  - Directory is too large');
        logger.warning('Please try removing node_modules manually: rm -rf node_modules');
        // Don't throw - allow the process to continue
        logger.warning('Continuing with other cleanup operations...');
      }
    }
  }

  const lockFiles = ['package-lock.json', 'yarn.lock', 'bun.lockb', 'pnpm-lock.yaml'];
  const existingLocks = lockFiles.filter((lockFile) => fs.existsSync(lockFile));

  if (existingLocks.length > 0) {
    logger.warning('Lock files detected:');
    existingLocks.forEach((file) => logger.info(`  - ${file}`));
    logger.info('');
    logger.info('Keeping lock files preserves deterministic installs and reduces version drift.');
    logger.info(
      'Removing lock files can install newer transitive versions and potentially resolve stale lock issues.'
    );
    logger.info('');

    const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
    if (isInteractive) {
      const answer = await askQuestion('Do you want to delete lock files? (y/N): ');
      if (answer === 'y' || answer === 'yes') {
        for (const file of existingLocks) {
          try {
            fs.removeSync(file);
            logger.success(`Removed ${file}`);
          } catch (e) {
            logger.warning(`Could not remove ${file}`);
          }
        }
      } else {
        logger.info('Keeping lock files for deterministic installs.');
      }
    } else {
      logger.info('Non-interactive shell detected. Keeping lock files by default.');
    }
  }

  if (fs.existsSync('.expo')) {
    try {
      fs.removeSync('.expo');
      logger.success('Removed .expo cache');
    } catch (e) {
      logger.warning('Could not remove .expo cache');
    }
  }
}

/**
 * Reinstall dependencies
 */
async function reinstallDependencies() {
  logger.step('Reinstalling dependencies...');

  // Detect package manager
  let packageManager = 'npm';
  if (commandExists('bun')) {
    packageManager = 'bun';
  } else if (commandExists('yarn')) {
    packageManager = 'yarn';
  } else if (commandExists('pnpm')) {
    packageManager = 'pnpm';
  }

  try {
    execCommandSync(packageManager, ['install'], { stdio: 'inherit' });
    logger.success('Dependencies installed');
  } catch (e) {
    logger.error('Failed to install dependencies');
    throw e;
  }
}

/**
 * Rebuild native code
 */
async function rebuildNative(platform) {
  logger.step('Rebuilding native code from scratch...');

  try {
    if (platform === 'all') {
      execCommandSync('npx', ['expo', 'prebuild', '--clean'], { stdio: 'inherit' });
    } else {
      execCommandSync('npx', ['expo', 'prebuild', '--clean', '--platform', platform], {
        stdio: 'inherit',
      });
    }
    logger.success('Native code rebuilt');
  } catch (e) {
    logger.error('Failed to rebuild native code');
    throw e;
  }
}

/**
 * Get bundle ID from app config
 */
async function getBundleId() {
  try {
    // Try app.json first
    if (fs.existsSync('app.json')) {
      const config = fs.readJsonSync('app.json');
      return config.expo?.android?.package || config.expo?.ios?.bundleIdentifier || null;
    }

    // Try app.config.js
    if (fs.existsSync('app.config.js')) {
      try {
        // Use require to load the config (works for both .js and .ts)
        delete require.cache[require.resolve(path.join(process.cwd(), 'app.config.js'))];
        const config = require(path.join(process.cwd(), 'app.config.js'));
        const expoConfig = config.default || config;
        return (
          expoConfig?.expo?.android?.package || expoConfig?.expo?.ios?.bundleIdentifier || null
        );
      } catch (e) {
        // If require fails, return null
        return null;
      }
    }

    // Try app.config.ts
    if (fs.existsSync('app.config.ts')) {
      try {
        // TypeScript configs need to be compiled, but we can try
        delete require.cache[require.resolve(path.join(process.cwd(), 'app.config.ts'))];
        const config = require(path.join(process.cwd(), 'app.config.ts'));
        const expoConfig = config.default || config;
        return (
          expoConfig?.expo?.android?.package || expoConfig?.expo?.ios?.bundleIdentifier || null
        );
      } catch (e) {
        return null;
      }
    }

    return null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  killRunningApps,
  cleanWatchman,
  cleanCaches,
  deleteNativeFolders,
  cleanDependencies,
  reinstallDependencies,
  rebuildNative,
  getBundleId,
};
