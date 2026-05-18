const inquirer = require('inquirer');
const prompt = inquirer.default?.prompt || inquirer.prompt;
const logger = require('../utils/logger');
const cleaner = require('../utils/cleaner');
const expoDoctor = require('../utils/expo-doctor');
const { execSync } = require('child_process');
const { execCommandSync } = require('../utils/commands');

async function devCommand(options) {
  logger.info('Starting development mode...');
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

  // Step 1: Run expo-doctor
  // logger.info('Step 1: Running health check...');
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

  // Step 2: Clean everything
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

  // Step 5: Run development build
  logger.info('Step 5: Starting development build...');

  try {
    const runWithDeviceSelection = async (targetPlatform) => {
      if (options.device) {
        // Expo CLI will prompt to choose among available emulators/simulators and connected devices.
        execCommandSync('npx', ['expo', `run:${targetPlatform}`, '--device'], { stdio: 'inherit' });
        return;
      }

      if (targetPlatform === 'android') {
        execSync('bun run android || npm run android || yarn android', { stdio: 'inherit' });
        return;
      }

      if (targetPlatform === 'ios') {
        execSync('bun run ios || npm run ios || yarn ios', { stdio: 'inherit' });
        return;
      }
    };

    if (platform === 'android') {
      await runWithDeviceSelection('android');
    } else if (platform === 'ios') {
      await runWithDeviceSelection('ios');
    } else {
      // For 'all', run Android first, then iOS
      logger.info('Building Android first...');
      await runWithDeviceSelection('android');
      logger.info('Now building iOS...');
      await runWithDeviceSelection('ios');
    }

    logger.success('✅ Development build completed!');
  } catch (e) {
    console.log('');
    logger.error('Failed to start development build');

    // Provide helpful error messages based on common issues
    // Note: Since we use stdio: 'inherit', the actual error output is already shown
    // We check the error code and provide context-specific help
    const errorCode = e.status || e.code;
    const errorMessage = (e.message || e.toString()).toLowerCase();

    // Check if it's a device/emulator issue (common exit codes: 1 for command errors)
    if (errorCode === 1 || errorMessage.includes('device') || errorMessage.includes('emulator')) {
      if (platform === 'android' || platform === 'all') {
        console.log('');
        logger.warning('No Android device or emulator found.');
        console.log('');
        logger.info('To fix this:');
        logger.info('  1. Connect an Android device via USB and enable USB debugging');
        logger.info('  2. Or start an Android emulator from Android Studio');
        logger.info(
          '  3. Or create an emulator: https://docs.expo.dev/workflow/android-studio-emulator'
        );
        console.log('');
        logger.info('Once a device is available, you can run:');
        logger.info('  budexp dev --android');
      } else if (platform === 'ios') {
        console.log('');
        logger.warning('No iOS simulator found.');
        console.log('');
        logger.info('To fix this:');
        logger.info('  1. Open Xcode and start a simulator');
        logger.info('  2. Or run: xcrun simctl list devices');
        logger.info('  3. Or create a simulator in Xcode: Xcode > Window > Devices and Simulators');
        console.log('');
        logger.info('Once a simulator is available, you can run:');
        logger.info('  budexp dev --ios');
      }
    } else {
      console.log('');
      logger.warning('Build failed. Check the error messages above for details.');
    }

    console.log('');
    logger.info('Note: All cleanup and setup steps completed successfully.');
    logger.info('The project is ready - you just need a device/emulator to run the build.');
    console.log('');

    // Exit gracefully instead of throwing
    process.exit(1);
  }
}

module.exports = devCommand;
