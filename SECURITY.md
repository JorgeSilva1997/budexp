# Security Policy

## Supported Versions

Security updates are provided for the latest published version of this package.

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

## Reporting a Vulnerability

Please do not report security vulnerabilities through public GitHub issues.

If you believe you have found a security vulnerability, please report it privately using GitHub's private vulnerability reporting feature, if available.

If private vulnerability reporting is not available, contact the maintainer directly.

Maintainer:

```txt
Jorge Silva
```

When reporting a vulnerability, please include as much detail as possible:

- A clear description of the vulnerability
- Steps to reproduce it
- The affected command, file, or workflow
- Potential impact
- Your operating system and Node.js version
- Any suggested fix, if you have one

Please avoid including secrets, tokens, private project IDs, or sensitive logs unless absolutely necessary.

## What to Expect

After a vulnerability is reported:

1. The maintainer will review the report.
2. If confirmed, a fix will be prioritized.
3. A patched version may be released to npm.
4. Public disclosure should wait until a fix is available, when possible.

## Security Considerations

`budexp` is a CLI tool that can execute local development commands related to Expo, React Native, EAS, Android, iOS, caches, dependencies, and build artifacts.

Security-sensitive areas include:

- Shell command execution
- User-provided command arguments
- File and folder deletion
- Generated HTML reports
- Build and submission workflows
- Logs that may contain sensitive project information

Contributions that improve input validation, safer command execution, error handling, or secure defaults are welcome.

## Responsible Disclosure

Please give the maintainer reasonable time to investigate and fix security issues before publicly disclosing them.

Thank you for helping keep this project and its users safe.
