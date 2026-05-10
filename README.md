# 🚀 budexp - Expo & React Native Dev Tools

[![npm](https://img.shields.io/npm/v/budexp?style=flat-square)](https://www.npmjs.com/package/budexp)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![Issues](https://img.shields.io/github/issues/JorgeSilva1997/budexp?style=flat-square)](https://github.com/JorgeSilva1997/budexp/issues)
[![Stars](https://img.shields.io/github/stars/JorgeSilva1997/budexp?style=flat-square)](https://github.com/JorgeSilva1997/budexp/stargazers)
[![Sponsors](https://img.shields.io/badge/sponsor-JorgeSilva1997-lightgrey?style=flat-square)](https://github.com/sponsors/JorgeSilva1997)

A powerful **CLI tool** that dramatically speeds up mobile development with **Expo**, **React Native**, **Android**, and **iOS**.

This toolkit automates the painful stuff:

- ✔ Cleaning caches
- ✔ Killing running apps
- ✔ Deleting native folders
- ✔ Reinstalling dependencies
- ✔ Rebuilding native code
- ✔ Building APK/IPA (local or cloud)
- ✔ Running dev builds
- ✔ Health checks with beautiful HTML reports
- ✔ EAS integration and build tracking
- ✔ Interactive progress indicators
- ✔ And more...

If you're tired of "Metro stuck", "Watchman warnings", weird build errors, or inconsistent native state... **this tool is for you.**

---

## ✨ Highlights

- 🎨 **Beautiful HTML Reports** - Visual health checks with recommendations
- 🏠 **Local & Cloud Builds** - Choose between fast local builds or EAS cloud builds
- 🔄 **Smart Progress Indicators** - Real-time spinners show what's happening
- 📊 **EAS Build Tracking** - List and view your builds without leaving the terminal
- 🎯 **Auto-fix Issues** - Automatically detect and fix common problems
- 🚀 **One-Command Workflows** - From clean slate to running app in minutes

---

## Installation

### Global Installation (Recommended)

```bash
npm install -g budexp
```

Or using yarn:

```bash
yarn global add budexp
```

Or using pnpm:

```bash
pnpm add -g budexp
```

### Local Development

```bash
git clone https://github.com/JorgeSilva1997/budexp.git
cd budexp
npm install
npm link  # Makes budexp available globally
```

---

## Requirements

- Node.js >= 14
- Expo project
- Expo CLI available through `npx expo`
- EAS CLI installed/logged in for EAS commands
- Android Studio/ADB for Android workflows
- Xcode for iOS workflows on macOS
- Watchman recommended on macOS

> **Important:** `budexp clean --all`, `budexp dev`, and `budexp build --local` perform cleanup operations in the current project. They can remove `node_modules`, clear caches, delete generated native folders (`android/` and/or `ios/`), reinstall dependencies, and rebuild native code. Run them from the root of the Expo project you want to operate on, preferably with a clean git state.

## Usage

### Development Mode

Run your app in development mode with automatic cleaning and rebuilding:

```bash
# Interactive platform selection
budexp dev

# Android only
budexp dev --android

# iOS only
budexp dev --ios

# Both platforms
budexp dev --all

# Select target device (emulator/simulator or physical)
budexp dev --android --device

# Skip report open prompt and continue if health issues are found
budexp dev --android --no-open --yes
```

**What it does:**

1. Runs `expo-doctor` with animated progress spinner
2. Generates a beautiful HTML health report with recommendations
3. Prompts to open the report in your browser
4. Kills running applications
5. Cleans all caches (Metro, Expo, Watchman)
6. Deletes native folders
7. Removes `node_modules`
8. Detects lock files and prompts whether to delete them (recommended: keep for deterministic installs)
9. Reinstalls dependencies
10. Rebuilds native code with `expo prebuild`
11. Starts the development build

### Build Mode (APK/IPA)

Build production-ready APK/IPA files locally or in the cloud:

```bash
# Interactive platform and build type selection
budexp build

# Android only
budexp build --android

# iOS only
budexp build --ios

# Both platforms
budexp build --all

# Force local build
budexp build --android --local

# Skip report open prompt and continue if health issues are found
budexp build --android --local --no-open --yes
```

**Build Options:**

- 🏠 **Local build** - Fast, free, no internet required
- ☁️ **Cloud build (EAS)** - Slower, requires EAS account, builds in the cloud

**What it does:**

1. Runs `expo-doctor` and generates HTML report
2. Asks you to choose local or cloud build
3. **For local builds:**
   - Performs full clean (same as dev mode)
   - Reinstalls dependencies
   - Rebuilds native code
   - Builds APK/IPA using EAS local build
   - Automatically moves build artifacts into `builds/` and names them with app name, version, and date
   - If `builds/` doesn’t exist, prompts for permission to create it
   - Checks whether `builds/` is ignored by `.gitignore` and prompts to add it if missing
   - Prompts to submit to App/Play Store
4. **For cloud builds:**
   - Checks EAS login status
   - Submits build to EAS cloud
   - Provides commands to track build progress

### Clean Command

Clean caches, dependencies, or native folders:

```bash
# Interactive cleaning options
budexp clean

# Clean everything
budexp clean --all

# Clean caches only
budexp clean --cache

# Clean native folders only
budexp clean --native
```

> `budexp clean --all` removes `node_modules`, clears Metro/Expo/Watchman caches, and can delete generated native folders. Use it only inside the Expo project you intend to clean.

### Check Commands

#### Health Check

Run `expo-doctor` and get a stunning HTML report:

```bash
budexp check health
# or simply
budexp check

# Generate the report without prompting to open it
budexp check --no-open
```

This will:

- Run `expo-doctor` with animated spinner
- Generate a beautiful HTML report with:
  - 📊 Statistics dashboard (errors, warnings, checks)
  - 💡 Actionable recommendations with direct links
  - ❌ Detailed error list
  - ⚠️ Warning list
  - 📋 Full terminal output with search
  - 🎨 Modern, gradient design
- Prompt to open report in your default browser
- Display summary in terminal

#### EAS Status

Check your EAS login status and configuration:

```bash
budexp check eas
```

Shows:

- Login status and email
- Build profiles configuration
- Submit configuration

#### EAS Build List

List your recent EAS builds:

```bash
budexp check eas:list
```

Displays your last 20 builds with:

- Build ID
- Platform (Android/iOS)
- Status (in progress, completed, failed)
- Created date
- App version

#### EAS Build Details

View detailed information about a specific build:

```bash
budexp check eas:view <build-id>
```

Shows:

- Complete build information
- Build artifacts
- Build logs
- Download links (if available)

#### EAS Project Info

Display EAS project configuration:

```bash
budexp check eas:project
```

Shows:

- Project ID
- Slug
- Owner
- SDK version

#### Auto-Fix

Run health check and attempt to fix issues:

```bash
budexp check fix
```

This will:

- Run `expo-doctor`
- Attempt to fix issues using `expo fix`
- Re-run health check to verify fixes
- Generate HTML reports

---

## Command Reference

### `budexp dev [options]`

Run app in development mode.

**Options:**

- `--android` - Build for Android only
- `--ios` - Build for iOS only
- `--all` - Build for both platforms
- `--device` - Select target device (emulator/simulator or physical)
- `--no-open` - Do not prompt to open the health report
- `--yes` - Automatically continue when health check issues are found

### `budexp build [options]`

Build APK/IPA for production.

**Options:**

- `--android` - Build for Android only
- `--ios` - Build for iOS only
- `--all` - Build for both platforms
- `--local` - Force local build (skip cloud build prompt)
- `--profile <name>` - EAS build profile
- `--no-open` - Do not prompt to open the health report
- `--yes` - Automatically continue when health check issues are found

### `budexp clean [options]`

Clean caches, dependencies, or native folders.

**Options:**

- `--all` - Clean everything (caches, node_modules, native folders)
- `--cache` - Clean caches only
- `--native` - Clean native folders only

### `budexp check [type] [buildId]`

Check app status and health.

**Types:**

- `health` (default) - Run expo-doctor and show health report
- `eas` - Check EAS login status and configuration
- `eas:list` - List recent EAS builds
- `eas:view <build-id>` - View detailed build information
- `eas:project` - Display EAS project info
- `fix` - Run health check and attempt to fix issues

**Options:**

- `--no-open` - Do not prompt to open the health report

**Examples:**

```bash
budexp check health
budexp check eas
budexp check eas:list
budexp check eas:view abc123-def456
budexp check eas:project
budexp check fix
```

---

## Features

### 🎨 Beautiful HTML Reports

Every health check generates a modern, interactive HTML report featuring:

- **Statistics Dashboard** - Quick overview of errors, warnings, and total checks
- **Recommendations Section** - Actionable steps with direct links to documentation
- **Collapsible Sections** - Organized errors and warnings
- **Search Functionality** - Find specific issues in terminal output
- **Copy to Clipboard** - One-click copy of full output
- **Responsive Design** - Works on mobile and desktop
- **Dark Theme** - Terminal-style output section

### 🏠 Local vs Cloud Builds

Choose your build strategy based on your needs:

| Feature  | Local Build          | Cloud Build       |
| -------- | -------------------- | ----------------- |
| Speed    | ⚡ Fast              | 🐌 Slower         |
| Cost     | 🆓 Free              | 💰 Requires EAS   |
| Internet | ❌ Not required      | ✅ Required       |
| Storage  | 💾 Uses your disk    | ☁️ Cloud storage  |
| Best for | Development, testing | Production, CI/CD |

### 🔄 Smart Progress Indicators

Never wonder what's happening:

- Animated spinners during long operations
- Clear status messages
- Success/warning/error indicators
- Real-time feedback

### 📊 EAS Build Tracking

Track your builds without leaving the terminal:

- List recent builds with status
- View detailed build information
- Check project configuration
- All from the command line

### 🎯 Automatic Health Checks

Before launching in dev mode or building APK/IPA, `budexp` automatically runs `expo-doctor` and generates a detailed HTML report. You'll be notified of any issues and can choose to continue or fix them first.

### 🧹 Smart Cleaning

The tool intelligently:

- Detects and kills running Metro/React Native processes
- Stops apps on connected Android devices
- Cleans all relevant caches (Metro, Expo, Watchman, Haste map)
- Removes native folders when needed
- Handles multiple package managers (npm, yarn, pnpm, bun)

### 🔐 EAS Integration

- Automatically detects EAS login status
- Prompts to login when needed
- Supports both local and cloud builds
- Build tracking and monitoring
- Automated submission flow

### 📝 Build Naming

APK/IPA files are automatically renamed with:

- App name (from `app.json`)
- Version number
- Current date

Format: `appname-1.0.0-2025-01-28.apk`

---

## Why This Exists

Expo & React Native sometimes get into a weird build state where:

- Caches break
- Native directories conflict
- Metro behaves erratically
- EAS builds fail
- Device installs get stuck

This toolkit solves all of that with one set of robust commands, plus beautiful reports and progress indicators to keep you informed.

---

## Quick Start

After installation, navigate to your Expo project directory and run:

```bash
# Check your project health with beautiful HTML report
budexp check health

# Start development mode
budexp dev --android

# Build for production (choose local or cloud)
budexp build --ios

# Track your EAS builds
budexp check eas:list
```

---

## Screenshots

### Health Check Report

Beautiful HTML reports with statistics, recommendations, and full terminal output.

### Progress Indicators

Real-time spinners show exactly what's happening during long operations.

### EAS Build List

Track all your builds from the command line.

---

## Contributing

PRs, improvements, and suggestions are welcome!

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Changelog

### v0.1.0

- 🎨 Beautiful HTML reports with recommendations
- 🏠 Local and cloud build options
- 🔄 Animated progress indicators
- 📊 EAS build tracking commands
- 🎯 Auto-fix functionality
- 🧹 Smart cleaning utilities
- 📝 Automatic build renaming

---
