// ============================================
// FILE: src/commands/check.js
// ============================================
const logger = require('../utils/logger');
const expoDoctor = require('../utils/expo-doctor');
const eas = require('../utils/eas');
const { execCommandSync } = require('../utils/commands');

async function checkCommand(type, buildId, options = {}) {
  if (type === 'health') {
    await checkHealth(options);
  } else if (type === 'eas') {
    await checkEAS();
  } else if (type === 'eas:list') {
    await checkEASList();
  } else if (type === 'eas:view') {
    await checkEASView(buildId);
  } else if (type === 'eas:project') {
    await checkEASProject();
  } else if (type === 'fix') {
    await checkFix(options);
  } else {
    logger.error(`Unknown check type: ${type}`);
    logger.info('Available types: health, eas, eas:list, eas:view [build-id], eas:project, fix');
  }
}

async function checkHealth(options = {}) {
  const doctorResult = await expoDoctor.runExpoDoctor({ openReport: options.open });
  const issuesSummary = expoDoctor.getIssuesSummary(doctorResult.output);

  console.log('');
  console.log('='.repeat(50));
  console.log('Health Check Summary');
  console.log('='.repeat(50));

  if (!issuesSummary.hasIssues) {
    logger.success('All checks passed! Your Expo project is healthy.');
  } else {
    logger.warning(issuesSummary.summary);
    console.log('');

    if (issuesSummary.errors && issuesSummary.errors.length > 0) {
      console.log('Errors:');
      issuesSummary.errors.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
      });
      console.log('');
    }

    if (issuesSummary.warnings && issuesSummary.warnings.length > 0) {
      console.log('Warnings:');
      issuesSummary.warnings.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message}`);
      });
      console.log('');
    }
  }

  console.log(`Detailed HTML report: ${doctorResult.reportPath}`);
  console.log('='.repeat(50));
  console.log('');
}

async function checkEAS() {
  await eas.displayEASStatus();
}

async function checkEASList() {
  await eas.listEASBuilds();
}

async function checkEASView(buildId) {
  if (!buildId) {
    logger.error('Build ID is required');
    logger.info('Usage: budexp check eas:view <build-id>');
    return;
  }
  await eas.viewEASBuild(buildId);
}

async function checkEASProject() {
  await eas.displayEASProjectInfo();
}

async function checkFix(options = {}) {
  logger.info('Running health check and looking for fixes...');
  console.log('');

  const doctorResult = await expoDoctor.runExpoDoctor({ openReport: options.open });
  const issuesSummary = expoDoctor.getIssuesSummary(doctorResult.output);

  if (!issuesSummary.hasIssues) {
    logger.success('No issues found! Your project is healthy.');
    return;
  }

  logger.warning(issuesSummary.summary);
  console.log('');

  // Try to run expo fix
  logger.info('Attempting to fix issues with expo fix...');
  console.log('');

  try {
    execCommandSync('npx', ['expo', 'fix'], { stdio: 'inherit' });
    logger.success('expo fix completed');
    console.log('');

    // Run doctor again to see if issues are resolved
    logger.info('Re-running health check to verify fixes...');
    const newDoctorResult = await expoDoctor.runExpoDoctor({ openReport: options.open });
    const newIssuesSummary = expoDoctor.getIssuesSummary(newDoctorResult.output);

    if (!newIssuesSummary.hasIssues) {
      logger.success('All issues have been resolved!');
    } else {
      logger.warning('Some issues remain. Please check the report for details.');
    }
  } catch (e) {
    logger.error('Failed to run expo fix');
    logger.info('Please check the HTML report for manual fixes:');
    logger.info(doctorResult.reportPath);
  }

  console.log('');
  logger.info(`Detailed HTML report: ${doctorResult.reportPath}`);
}

module.exports = checkCommand;
