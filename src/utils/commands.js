const { execFileSync } = require('child_process');

function shouldUseShell(command, options = {}) {
  return (
    process.platform === 'win32' &&
    options.shell === undefined &&
    typeof command === 'string' &&
    !command.includes('\\') &&
    !command.includes('/')
  );
}

function execCommandSync(command, args = [], options = {}) {
  const execOptions = shouldUseShell(command, options) ? { ...options, shell: true } : options;
  return execFileSync(command, args, execOptions);
}

function commandExists(command) {
  try {
    const lookupCommand = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(lookupCommand, [command], { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  commandExists,
  execCommandSync,
};
