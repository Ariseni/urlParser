import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', // Ensure this matches your test folder
  reporter: 'list', // Optional: Customize reporter
  use: {
    headless: true, // Optional: Run in headless mode
  },
});
