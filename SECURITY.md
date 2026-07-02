# Security Policy

## Supported Versions

Only the latest version of Civetra is currently supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

## Reporting a Vulnerability

We take the security of Civetra very seriously. If you believe you have found a security vulnerability, please report it to us immediately.

**Do not open a public issue.** Instead, please follow this process:

1. Send an email to [parakhpratyush@gmail.com](mailto:parakhpratyush@gmail.com).
2. Include a detailed description of the vulnerability.
3. Provide steps to reproduce the issue.
4. If possible, include potential remediation steps.

We will acknowledge your report within 48 hours and provide a timeline for a fix.

## Our Security Commitment

- **Zero Hardcoded Secrets**: We use environment variables for all sensitive configuration.
- **Dependency Audits**: We regularly run `npm audit` to ensure all packages are secure.
- **Least Privilege**: All API keys (Firebase, TomTom, etc.) are restricted to specific domains and services.
