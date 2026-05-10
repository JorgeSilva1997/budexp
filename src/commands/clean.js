const inquirer = require('inquirer');
const prompt = inquirer.default?.prompt || inquirer.prompt;
const logger = require('../utils/logger');
const cleaner = require('../utils/cleaner');

async function cleanCommand(options) {
  logger.info('Starting clean process...');
  const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

  let cleanAll = options.all;
  let cleanCache = options.cache;
  let cleanNative = options.native;

  // If no options specified, ask user
  if (!cleanAll && !cleanCache && !cleanNative && isInteractive) {
    const answer = await prompt([
      {
        type: 'list',
        name: 'cleanType',
        message: 'What do you want to clean?',
        choices: [
          { name: 'Everything (caches, node_modules, native folders)', value: 'all' },
          { name: 'Caches only', value: 'cache' },
          { name: 'Native folders only', value: 'native' },
        ],
      },
    ]);

    if (answer.cleanType === 'all') {
      cleanAll = true;
    } else if (answer.cleanType === 'cache') {
      cleanCache = true;
    } else {
      cleanNative = true;
    }
  } else if (!cleanAll && !cleanCache && !cleanNative) {
    logger.warning('No clean option provided in non-interactive mode.');
    logger.info('Use --all, --cache, or --native.');
    return;
  }

  if (cleanAll) {
    logger.info('Cleaning everything...');

    const bundleId = await cleaner.getBundleId();
    const platform = 'all';

    await cleaner.killRunningApps(bundleId, platform);
    await cleaner.cleanWatchman();
    await cleaner.cleanCaches();
    await cleaner.deleteNativeFolders(platform);
    await cleaner.cleanDependencies();

    logger.success('✅ Everything cleaned!');
  } else if (cleanCache) {
    logger.info('Cleaning caches only...');

    await cleaner.killRunningApps(null, 'all');
    await cleaner.cleanWatchman();
    await cleaner.cleanCaches();

    logger.success('✅ Caches cleaned!');
  } else if (cleanNative) {
    logger.info('Cleaning native folders only...');

    let platform = 'all';

    if (isInteractive) {
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
      logger.info('Non-interactive shell detected. Removing both native folders.');
    }

    await cleaner.deleteNativeFolders(platform);

    logger.success('✅ Native folders cleaned!');
  }
}

module.exports = cleanCommand;
