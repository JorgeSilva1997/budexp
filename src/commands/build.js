// ============================================
// FILE: src/commands/build.js (Enhanced with local/cloud selection)
// ============================================
const inquirer = require('inquirer');
const prompt = inquirer.default?.prompt || inquirer.prompt;
const logger = require('../utils/logger');
const cleaner = require('../utils/cleaner');
const expoDoctor = require('../utils/expo-doctor');
const eas = require('../utils/eas');
const { execCommandSync } = require('../utils/commands');
const fs = require('fs-extra');
const path = require('path');

async function buildCommand(options) {
  logger.info('Starting build mode...');
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  // Determine platform
  let platform = 'android'; // default
  if (options.all) {
    platform = 'all';
  } else if (options.ios) {
    platform = 'ios';
  } else if (options.android) {
    platform = 'android';
  } else if (isInteractive) {
    // Ask user if no platform specified
    const answer = await prompt([
      {
        type: 'list',
        name: 'platform',
        message: 'Select platform:',
        choices: [
          { name: 'Android', value: 'android' },
          { name: 'iOS', value: 'ios' },
          { name: 'Both', value: 'all' },
        ],
      },
    ]);
    platform = answer.platform;
  } else {
    logger.info('Non-interactive shell detected. Using default platform: android');
  }

  logger.info(`Platform: ${platform}`);
  console.log('');

  // Ask about build type (local vs cloud)
  let buildLocally = options.local || false;

  if (!options.local && isInteractive) {
    const buildTypeAnswer = await prompt([
      {
        type: 'list',
        name: 'buildType',
        message: 'How do you want to build?',
        choices: [
          {
            name: '🏠 Local build (faster, no internet required, free)',
            value: 'local',
          },
          {
            name: '☁️  Cloud build via EAS (requires EAS account, slower)',
            value: 'cloud',
          },
        ],
      },
    ]);

    buildLocally = buildTypeAnswer.buildType === 'local';
  } else if (!options.local) {
    logger.info('Non-interactive shell detected. Using cloud build by default.');
  }

  logger.info(`Build type: ${buildLocally ? 'Local' : 'Cloud (EAS)'}`);
  console.log('');

  const buildProfile = await resolveBuildProfile(options);
  logger.info(`Build profile: ${buildProfile}`);
  console.log('');

  // If cloud build, check EAS login
  if (!buildLocally) {
    const easStatus = await eas.checkEASLogin();

    if (!easStatus.loggedIn) {
      logger.warning('You need to be logged in to EAS for cloud builds');

      if (!isInteractive) {
        logger.info('Non-interactive shell detected. Run eas login before starting a cloud build.');
        return;
      }

      const loginAnswer = await prompt([
        {
          type: 'confirm',
          name: 'login',
          message: 'Do you want to login to EAS now?',
          default: true,
        },
      ]);

      if (loginAnswer.login) {
        try {
          execCommandSync('eas', ['login'], { stdio: 'inherit' });
        } catch (e) {
          logger.error('Failed to login to EAS');
          return;
        }
      } else {
        logger.info('Build cancelled. You need to be logged in for cloud builds.');
        return;
      }
    }
  }

  // Step 1: Run expo-doctor
  const doctorResult = await expoDoctor.runExpoDoctor({ openReport: options.open });
  const issuesSummary = expoDoctor.getIssuesSummary(doctorResult.output);

  if (issuesSummary.hasIssues) {
    logger.warning(issuesSummary.summary);
    logger.info(`Detailed report saved to: ${doctorResult.reportPath}`);

    let shouldContinue = Boolean(options.yes);

    if (!shouldContinue && isInteractive) {
      const continueAnswer = await prompt([
        {
          type: 'confirm',
          name: 'continue',
          message: 'Issues found. Do you want to continue anyway?',
          default: false,
        },
      ]);
      shouldContinue = continueAnswer.continue;
    }

    if (!shouldContinue) {
      logger.info('Aborted by user');
      return;
    }
  } else {
    logger.success('Health check passed!');
  }

  console.log('');

  // Step 2: Clean everything (only for local builds)
  if (buildLocally) {
    logger.info('Step 2: Cleaning caches and dependencies...');
    const bundleId = await cleaner.getBundleId();

    await cleaner.killRunningApps(bundleId, platform);
    await cleaner.cleanWatchman();
    await cleaner.cleanCaches();
    await cleaner.deleteNativeFolders(platform);
    await cleaner.cleanDependencies();

    console.log('');

    // Step 3: Reinstall dependencies
    logger.info('Step 3: Reinstalling dependencies...');
    await cleaner.reinstallDependencies();

    console.log('');

    // Step 4: Rebuild native code
    logger.info('Step 4: Rebuilding native code...');
    await cleaner.rebuildNative(platform);

    console.log('');
  }

  // Step 5: Build APK/IPA
  logger.info(`Step ${buildLocally ? '5' : '2'}: Building ${platform.toUpperCase()}...`);

  try {
    if (buildLocally) {
      // Local build
      if (platform === 'all') {
        logger.info('Building Android first...');
        execCommandSync(
          'eas',
          ['build', '--platform', 'android', '--local', '--profile', buildProfile],
          {
            stdio: 'inherit',
          }
        );
        await moveBuildArtifactsToFolder('android');

        logger.info('Now building iOS...');
        execCommandSync(
          'eas',
          ['build', '--platform', 'ios', '--local', '--profile', buildProfile],
          {
            stdio: 'inherit',
          }
        );
        await moveBuildArtifactsToFolder('ios');
      } else {
        execCommandSync(
          'eas',
          ['build', '--platform', platform, '--local', '--profile', buildProfile],
          {
            stdio: 'inherit',
          }
        );
        await moveBuildArtifactsToFolder(platform);
      }
    } else {
      // Cloud build via EAS
      if (platform === 'all') {
        logger.info('Starting Android cloud build...');
        execCommandSync('eas', ['build', '--platform', 'android', '--profile', buildProfile], {
          stdio: 'inherit',
        });

        logger.info('Starting iOS cloud build...');
        execCommandSync('eas', ['build', '--platform', 'ios', '--profile', buildProfile], {
          stdio: 'inherit',
        });
      } else {
        execCommandSync('eas', ['build', '--platform', platform, '--profile', buildProfile], {
          stdio: 'inherit',
        });
      }

      logger.success('✅ Build submitted to EAS!');
      console.log('');
      logger.info('Track your build progress:');
      logger.info('  - Run: budexp check eas:list');
      logger.info('  - Or visit: https://expo.dev');
    }

    if (buildLocally) {
      logger.success('✅ Build completed!');
    }
  } catch (e) {
    console.log('');
    logger.error('Build failed');

    // Provide helpful error messages
    const errorCode = e.status || e.code;
    const errorMessage = (e.message || e.toString()).toLowerCase();

    if (
      errorCode === 1 ||
      errorMessage.includes('eas project') ||
      errorMessage.includes('eas init') ||
      errorMessage.includes('not configured')
    ) {
      console.log('');
      logger.warning('EAS project is not configured.');
      console.log('');
      logger.info('To fix this:');
      logger.info('  1. Run: eas init');
      logger.info('  2. Follow the prompts to configure your EAS project');
      console.log('');
      logger.info('Learn more: https://docs.expo.dev/build/setup/');
    } else {
      console.log('');
      logger.warning('Build failed. Check the error messages above for details.');
    }

    process.exit(1);
  }

  console.log('');

  // Only ask about submission for local builds
  if (buildLocally && isInteractive) {
    const submitAnswer = await prompt([
      {
        type: 'confirm',
        name: 'submit',
        message: 'Do you want to submit the build to App/Play Store?',
        default: false,
      },
    ]);

    if (submitAnswer.submit) {
      const easStatus = await eas.checkEASLogin();

      if (!easStatus.loggedIn) {
        logger.warning('Not logged in to EAS. Please run: eas login');
        const loginAnswer = await prompt([
          {
            type: 'confirm',
            name: 'login',
            message: 'Do you want to login to EAS now?',
            default: true,
          },
        ]);

        if (loginAnswer.login) {
          try {
            execCommandSync('eas', ['login'], { stdio: 'inherit' });
          } catch (e) {
            logger.error('Failed to login to EAS');
            return;
          }
        } else {
          return;
        }
      }

      // Submit builds
      if (platform === 'all') {
        await eas.submitToEAS('android');
        await eas.submitToEAS('ios');
      } else {
        await eas.submitToEAS(platform);
      }
    }
  }
}

async function resolveBuildProfile(options) {
  if (typeof options.profile === 'string' && options.profile.trim().length > 0) {
    const profile = options.profile.trim();
    validateBuildProfile(profile);
    return profile;
  }

  const knownProfiles = ['development', 'preview', 'production'];
  const easProfiles = getEASProfiles();
  const profileChoices = [...new Set([...knownProfiles, ...easProfiles])];
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (!isInteractive) {
    return 'preview';
  }

  const answer = await prompt([
    {
      type: 'list',
      name: 'profile',
      message: 'Select build profile:',
      choices: profileChoices.map((profile) => ({
        name: profile,
        value: profile,
      })),
      default: profileChoices.includes('preview') ? 'preview' : profileChoices[0],
    },
  ]);

  return answer.profile;
}

function validateBuildProfile(profile) {
  if (!/^[a-zA-Z0-9_.-]+$/.test(profile)) {
    throw new Error(
      'Invalid build profile. Use only letters, numbers, underscores, dots, and hyphens.'
    );
  }
}

function getEASProfiles() {
  const easConfigPath = path.join(process.cwd(), 'eas.json');
  if (!fs.existsSync(easConfigPath)) {
    return [];
  }

  try {
    const easConfig = fs.readJsonSync(easConfigPath);
    const profiles = easConfig?.build;
    if (!profiles || typeof profiles !== 'object') {
      return [];
    }

    return Object.keys(profiles).filter(
      (profile) => typeof profile === 'string' && profile.trim().length > 0
    );
  } catch (error) {
    logger.warning('Could not read eas.json build profiles. Using defaults.');
    return [];
  }
}

/**
 * Ensure `builds/` exists (ask permission if missing) and is gitignored.
 */
async function ensureBuildsFolderAndGitignore() {
  const buildsDir = path.join(process.cwd(), 'builds');
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  if (!fs.existsSync(buildsDir)) {
    if (!isInteractive) {
      logger.warning('builds/ folder does not exist and shell is non-interactive.');
      logger.warning('Keeping build artifacts in their current location.');
      return { ok: false, buildsDir };
    }

    const createAnswer = await prompt([
      {
        type: 'confirm',
        name: 'create',
        message: 'Build output folder "builds/" does not exist. Create it in project root?',
        default: true,
      },
    ]);

    if (!createAnswer.create) {
      logger.info('Keeping build artifacts in their current location.');
      return { ok: false, buildsDir };
    }

    fs.ensureDirSync(buildsDir);
    logger.success('Created builds/ folder');
  }

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const alreadyIgnored =
      gitignore.includes('\nbuilds/\n') ||
      gitignore.includes('\n/builds/\n') ||
      gitignore.includes('\nbuilds\n') ||
      gitignore.includes('\n/builds\n') ||
      gitignore.trim() === 'builds/' ||
      gitignore.trim() === '/builds/' ||
      gitignore.trim() === 'builds' ||
      gitignore.trim() === '/builds';

    if (!alreadyIgnored) {
      if (!isInteractive) {
        logger.warning('"builds/" is not listed in .gitignore (non-interactive).');
        logger.warning('Consider adding it to prevent committing .aab/.apk/.ipa artifacts.');
      } else {
        logger.warning('"builds/" is not listed in .gitignore.');
        logger.info('Build artifacts can be large and are usually not meant to be committed.');
        const addAnswer = await prompt([
          {
            type: 'confirm',
            name: 'add',
            message: 'Do you want to add "builds/" to .gitignore?',
            default: true,
          },
        ]);

        if (addAnswer.add) {
          const needsNewline = gitignore.length > 0 && !gitignore.endsWith('\n');
          const updated = `${gitignore}${needsNewline ? '\n' : ''}\n# Build artifacts\nbuilds/\n`;
          fs.writeFileSync(gitignorePath, updated, 'utf8');
          logger.success('Added builds/ to .gitignore');
        } else {
          logger.warning(
            'Not adding builds/ to .gitignore. Be careful not to commit build artifacts.'
          );
        }
      }
    }
  } else {
    logger.warning('.gitignore not found in project root.');
    if (isInteractive) {
      const createGitignoreAnswer = await prompt([
        {
          type: 'confirm',
          name: 'create',
          message: 'Do you want to create a .gitignore and ignore "builds/"?',
          default: true,
        },
      ]);

      if (createGitignoreAnswer.create) {
        fs.writeFileSync(gitignorePath, '# Build artifacts\nbuilds/\n', 'utf8');
        logger.success('Created .gitignore and added builds/');
      }
    }
  }

  return { ok: true, buildsDir };
}

/**
 * Move build artifacts into builds/ with app name + version.
 */
async function moveBuildArtifactsToFolder(platform) {
  try {
    const { ok, buildsDir } = await ensureBuildsFolderAndGitignore();

    // Try to get config from app.json or app.config.js
    let config = null;
    if (fs.existsSync('app.json')) {
      config = fs.readJsonSync('app.json');
    } else if (fs.existsSync('app.config.js')) {
      try {
        delete require.cache[require.resolve(path.join(process.cwd(), 'app.config.js'))];
        const loaded = require(path.join(process.cwd(), 'app.config.js'));
        config = loaded.default || loaded;
      } catch (e) {
        // Ignore
      }
    }

    if (!config) return;

    const appName = (config.expo?.name || 'app').toLowerCase().replace(/[^a-z0-9]/g, '');
    // This is the target Expo app version, not the budexp package version.
    const version = config.expo?.version || '1.0.0';
    const currentDate = new Date().toISOString().split('T')[0];
    const customName = `${appName}-${version}-${currentDate}`;

    // Search for build files
    const searchDirs = [process.cwd(), path.join(process.cwd(), 'dist')];

    const wantedExtensions =
      platform === 'android' ? ['.aab', '.apk'] : platform === 'ios' ? ['.ipa'] : [];

    if (wantedExtensions.length === 0) return;

    let latestArtifact = null;
    let latestMtime = 0;

    for (const dir of searchDirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!wantedExtensions.includes(ext)) continue;

          const filePath = path.join(dir, file);
          const stats = fs.statSync(filePath);
          const fileMtime = stats.mtime.getTime();

          if (fileMtime > Date.now() - 10 * 60 * 1000 && fileMtime > latestMtime) {
            latestArtifact = filePath;
            latestMtime = fileMtime;
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }

    if (!latestArtifact) return;

    const ext = path.extname(latestArtifact).toLowerCase();
    const targetDir = ok ? buildsDir : process.cwd();
    const newPath = path.join(targetDir, `${customName}${ext}`);

    fs.moveSync(latestArtifact, newPath, { overwrite: true });
    logger.success(`Build artifact saved to: ${path.relative(process.cwd(), newPath)}`);
  } catch (e) {
    logger.warning('Could not rename build file: ' + e.message);
  }
}

module.exports = buildCommand;
