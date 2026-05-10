#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const packageJson = require('../package.json');

// Import command modules
const devCommand = require('../src/commands/dev');
const buildCommand = require('../src/commands/build');
const cleanCommand = require('../src/commands/clean');
const checkCommand = require('../src/commands/check');

// CLI metadata
program
  .name('budexp')
  .description(
    'A powerful CLI tool to facilitate mobile development with Expo + React Native stack'
  )
  .version(packageJson.version);

// Improve error UX
program.showHelpAfterError();
program.showSuggestionAfterError();

// Emoji map
const icons = {
  dev: '🧪',
  build: '📦',
  clean: '🧹',
  check: '🔍',
  help: '❓',
};

// Custom help UI
program.configureHelp({
  formatHelp: (cmd, helper) => {
    const commands = helper.visibleCommands(cmd);
    const options = helper.visibleOptions(cmd);
    const isRoot = cmd === program;

    const maxCommandLen = Math.max(4, ...commands.map((c) => c.name().length));
    const maxFlagsLen = Math.max(8, ...options.map((o) => o.flags.length));

    const headerTitle = isRoot ? '🚀 budexp' : `🚀 budexp ${cmd.name()}`;
    const headerSubtitle = isRoot
      ? 'A powerful CLI for Expo + React Native'
      : cmd.description() || 'Command help';

    const commandsSection =
      commands.length > 0
        ? `${chalk.yellow('\nCOMMANDS')}\n${commands
            .map((c) => {
              const name = c.name();
              const icon = icons[name] || ' ';
              return `  ${icon} ${chalk.green(name.padEnd(maxCommandLen + 2))}${c.description()}`;
            })
            .join('\n')}\n`
        : '';

    const optionsSection =
      options.length > 0
        ? `${chalk.yellow('\nOPTIONS')}\n${options
            .map((o) => `  ${chalk.cyan(o.flags.padEnd(maxFlagsLen + 2))}${o.description}`)
            .join('\n')}\n`
        : '';

    const examples = isRoot
      ? [
          '$ budexp dev --ios',
          '$ budexp dev --android --device',
          '$ budexp build --android',
          '$ budexp clean --all',
          '$ budexp check eas:list',
        ]
      : cmd.name() === 'dev'
        ? [
            '$ budexp dev --ios',
            '$ budexp dev --android',
            '$ budexp dev --android --device',
            '$ budexp dev --all --device',
          ]
        : cmd.name() === 'build'
          ? ['$ budexp build --android', '$ budexp build --ios', '$ budexp build --all']
          : cmd.name() === 'clean'
            ? ['$ budexp clean --all', '$ budexp clean --cache', '$ budexp clean --native']
            : cmd.name() === 'check'
              ? [
                  '$ budexp check',
                  '$ budexp check eas',
                  '$ budexp check eas:list',
                  '$ budexp check eas:view <buildId>',
                ]
              : [`$ ${helper.commandUsage(cmd)}`];

    const examplesSection = `${chalk.yellow('\nEXAMPLES')}\n${examples
      .map((e) => `  ${chalk.gray(e)}`)
      .join('\n')}\n`;

    const tip = isRoot
      ? `${chalk.gray('\nTip:')} ${chalk.gray('Run')} ${chalk.white('budexp <command> --help')} ${chalk.gray('for command options.')}\n`
      : '';

    return `\n${chalk.bold.cyan(headerTitle)}\n${chalk.gray('────────────────────────────')}\n${chalk.gray(headerSubtitle)}\n\n${chalk.yellow('USAGE')}\n  ${helper.commandUsage(cmd)}\n${commandsSection}${optionsSection}${examplesSection}${tip}`;
  },
});

// Dev command
program
  .command('dev')
  .description('Run the app in development mode')
  .option('--all', 'Run on both iOS and Android')
  .option('--ios', 'Run on iOS only')
  .option('--android', 'Run on Android only')
  .option('--device', 'Select target device (emulator/simulator or physical)')
  .option('--no-open', 'Do not prompt to open the health report')
  .option('--yes', 'Automatically continue when health check issues are found')
  .action(async (options) => {
    await devCommand(options);
  });

// Build command
program
  .command('build')
  .description('Build APK/IPA for production')
  .option('--all', 'Build for both iOS and Android')
  .option('--ios', 'Build for iOS only')
  .option('--android', 'Build for Android only')
  .option('--local', 'Build locally using EAS local build')
  .option('--profile <name>', 'EAS build profile (e.g. development, preview, production)')
  .option('--no-open', 'Do not prompt to open the health report')
  .option('--yes', 'Automatically continue when health check issues are found')
  .action(async (options) => {
    await buildCommand(options);
  });

// Clean command
program
  .command('clean')
  .description('Clean caches, node_modules, and native folders')
  .option('--all', 'Clean everything including native folders')
  .option('--cache', 'Clean caches only')
  .option('--native', 'Clean native folders only')
  .action(async (options) => {
    await cleanCommand(options);
  });

// Check command
program
  .command('check')
  .description('Check app status and health')
  .argument(
    '[type]',
    'Type of check: health, eas, eas:list, eas:view, eas:project, or fix',
    'health'
  )
  .argument('[buildId]', 'Build ID for eas:view command')
  .option('--no-open', 'Do not prompt to open the health report')
  .action(async (type, buildId, options) => {
    await checkCommand(type, buildId, options);
  });

program.parse();
