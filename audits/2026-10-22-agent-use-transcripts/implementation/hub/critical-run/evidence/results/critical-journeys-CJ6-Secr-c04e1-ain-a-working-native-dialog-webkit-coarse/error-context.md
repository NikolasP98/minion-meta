# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-journeys.spec.ts >> CJ6 Secret close and rapid reopen retain a working native dialog
- Location: tests/e2e/ui-audit/critical-journeys.spec.ts:190:1

# Error details

```
Error: browserType.launch: 
╔══════════════════════════════════════════════════════╗
║ Host system is missing dependencies to run browsers. ║
║ Please install them with the following command:      ║
║                                                      ║
║     sudo npx playwright install-deps                 ║
║                                                      ║
║ Alternatively, use apt:                              ║
║     sudo apt-get install libicu74\                   ║
║         libxml2\                                     ║
║         libflite1                                    ║
║                                                      ║
║ <3 Playwright Team                                   ║
╚══════════════════════════════════════════════════════╝
```