// ============================================
// FILE: src/utils/eas.js (Enhanced)
// ============================================
const logger = require('./logger');
const { execCommandSync } = require('./commands');

function validatePlatform(platform) {
  if (!['android', 'ios'].includes(platform)) {
    throw new Error(`Invalid platform: ${platform}`);
  }
}

function validateBuildId(buildId) {
  if (typeof buildId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(buildId)) {
    throw new Error('Invalid build ID. Use only letters, numbers, underscores, and hyphens.');
  }
}

/**
 * Check EAS login status
 */
async function checkEASLogin() {
  logger.step('Checking EAS login status...');

  try {
    const output = execCommandSync('eas', ['whoami'], { encoding: 'utf8', stdio: 'pipe' });
    const email = output.trim();

    if (email && !email.includes('error') && !email.includes('not logged')) {
      logger.success(`Logged in as: ${email}`);
      return {
        loggedIn: true,
        email,
      };
    }
  } catch (e) {
    // Not logged in or error
  }

  logger.warning('Not logged in to EAS');
  return {
    loggedIn: false,
    email: null,
  };
}

/**
 * Get EAS configuration
 */
async function getEASConfig() {
  logger.step('Reading EAS configuration...');

  try {
    const fs = require('fs-extra');
    const path = require('path');

    const easConfigPath = path.join(process.cwd(), 'eas.json');

    if (!fs.existsSync(easConfigPath)) {
      logger.warning('eas.json not found');
      return null;
    }

    const config = fs.readJsonSync(easConfigPath);
    logger.success('EAS configuration loaded');

    return config;
  } catch (e) {
    logger.error('Failed to read EAS configuration');
    return null;
  }
}

/**
 * Display EAS status information
 */
async function displayEASStatus() {
  const loginStatus = await checkEASLogin();
  const config = await getEASConfig();

  console.log('\n' + '='.repeat(50));
  console.log('EAS Status');
  console.log('='.repeat(50));

  console.log(`\nLogin Status: ${loginStatus.loggedIn ? '✔ Logged in' : '✖ Not logged in'}`);
  if (loginStatus.email) {
    console.log(`Email: ${loginStatus.email}`);
  }

  if (config) {
    console.log('\nBuild Profiles:');
    const profiles = Object.keys(config.build || {});
    if (profiles.length > 0) {
      profiles.forEach((profile) => {
        console.log(`  - ${profile}`);
        const profileConfig = config.build[profile];
        if (profileConfig.platform) {
          console.log(
            `    Platform: ${Array.isArray(profileConfig.platform) ? profileConfig.platform.join(', ') : profileConfig.platform}`
          );
        }
      });
    } else {
      console.log('  No build profiles found');
    }

    if (config.submit) {
      console.log('\nSubmit Configuration:');
      Object.keys(config.submit).forEach((platform) => {
        console.log(`  ${platform}: configured`);
      });
    }
  } else {
    console.log('\nNo EAS configuration found');
  }

  console.log('\n' + '='.repeat(50) + '\n');

  return {
    loginStatus,
    config,
  };
}

/**
 * List recent EAS builds
 */
async function listEASBuilds() {
  logger.step('Fetching recent EAS builds...');

  try {
    console.log('');
    execCommandSync('eas', ['build:list', '--limit', '20'], { stdio: 'inherit' });
    console.log('');
  } catch (e) {
    logger.error('Failed to fetch builds. Make sure you are logged in to EAS.');
    logger.info('Run: eas login');
  }
}

/**
 * View specific EAS build details
 */
async function viewEASBuild(buildId) {
  logger.step(`Fetching build details for: ${buildId}`);

  try {
    validateBuildId(buildId);
    console.log('');
    execCommandSync('eas', ['build:view', buildId], { stdio: 'inherit' });
    console.log('');
  } catch (e) {
    logger.error(`Failed to fetch build ${buildId}`);
    logger.info('Make sure the build ID is correct and you have access to it.');
  }
}

/**
 * Display EAS project information
 */
async function displayEASProjectInfo() {
  logger.step('Fetching EAS project information...');

  try {
    console.log('');
    execCommandSync('eas', ['project:info'], { stdio: 'inherit' });
    console.log('');
  } catch (e) {
    logger.error('Failed to fetch project info');
    logger.info('Make sure you are logged in and the project is configured.');
  }
}

/**
 * Submit build to EAS
 */
async function submitToEAS(platform) {
  logger.step(`Submitting ${platform} build to EAS...`);

  try {
    validatePlatform(platform);
    execCommandSync('eas', ['submit', '--platform', platform], { stdio: 'inherit' });
    logger.success('Build submitted successfully');
  } catch (e) {
    logger.error('Failed to submit build to EAS');
    throw e;
  }
}

module.exports = {
  checkEASLogin,
  getEASConfig,
  displayEASStatus,
  listEASBuilds,
  viewEASBuild,
  displayEASProjectInfo,
  submitToEAS,
};
