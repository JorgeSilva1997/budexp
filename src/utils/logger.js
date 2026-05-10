const chalk = require('chalk');

const logger = {
  info: (message) => {
    console.log(chalk.blue('[INFO]'), message);
  },

  success: (message) => {
    console.log(chalk.green('[SUCCESS]'), message);
  },

  warning: (message) => {
    console.log(chalk.yellow('[WARNING]'), message);
  },

  error: (message) => {
    console.log(chalk.red('[ERROR]'), message);
  },

  step: (message) => {
    console.log(chalk.cyan('→'), message);
  },
};

module.exports = logger;
