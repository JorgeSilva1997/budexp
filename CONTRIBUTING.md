# Contributing

Thank you for your interest in contributing to this project.

This project exists to help the Expo and React Native community build, clean, check, and debug projects faster. Contributions are welcome, whether they are bug fixes, documentation improvements, new features, or ideas for better workflows.

## Ways to contribute

You can contribute by:

- Reporting bugs
- Suggesting new features
- Improving documentation
- Opening pull requests
- Testing the CLI in real Expo projects
- Sharing feedback about developer experience

## Reporting bugs

Before opening a bug report, please check if a similar issue already exists.

When reporting a bug, include:

- A clear title
- What command you ran
- What you expected to happen
- What actually happened
- Your operating system
- Node.js version
- npm/yarn/pnpm/bun version
- Expo SDK version, if relevant
- Any terminal output or error message

Please avoid sharing secrets, tokens, private project IDs, or sensitive logs.

## Suggesting features

Feature requests are welcome.

When suggesting a feature, please include:

- The problem you are trying to solve
- Why the feature would be useful
- An example of how you imagine using it
- Any alternatives you have considered

Small, focused features are usually easier to review and merge.

## Pull requests

Before opening a pull request:

- Create an issue first for larger changes.
- Keep the change focused and easy to review.
- Follow the existing code style.
- Update documentation if behavior changes.
- Add or update tests when possible.
- Make sure the CLI still works locally.

Recommended checks:

```bash
npm install
npm run lint
npm run format:check
npm test
If your change affects CLI behavior, also test the relevant command manually:

node bin/budexp.js --help
node bin/budexp.js check --help
node bin/budexp.js dev --help
node bin/budexp.js build --help
node bin/budexp.js clean --help
Development setup
Clone the repository:

git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
npm install
Run the CLI locally:

node bin/budexp.js --help
Optionally link it globally while developing:

npm link
budexp --help
Code style
This project uses ESLint and Prettier.

Please run:

npm run lint
npm run format:check
To format files:

npm run format
Commit and PR guidelines
Please use clear commit messages.

Good examples:

fix: handle missing eas.json gracefully
docs: improve installation instructions
feat: add no-open flag for health reports
chore: update dependencies
Pull request titles should clearly describe the change.