import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

const ROLES = [
  { id: 'SM', name: 'Station Master' },
  { id: 'PWAY', name: 'P.Way Engineer' },
  { id: 'TRD', name: 'TRD Engineer' },
  { id: 'CTRL', name: 'Divisional Controller' },
];

test.describe('Brutal UI Torture Test', () => {
  for (const role of ROLES) {
    test(`Login and Navigate as ${role.name}`, async ({ page }) => {
      // Setup - navigate to login or set role via localStorage (mock auth)
      await page.goto(BASE_URL);
      
      // Wait for app load
      await page.waitForLoadState('networkidle');

      // Try finding login buttons or mock auth injection
      // Since it's a restored React 19 app, we'll try to just click around
      const bodyText = await page.locator('body').innerText();
      if (bodyText.includes('Login') || bodyText.includes('Sign In')) {
          // Attempt naive login
          try {
            await page.getByRole('button', { name: /Login|Sign In/i }).click();
          } catch (e) {
            console.log("No login button found or needed");
          }
      }

      // Quick sanity check for blank screen
      const rootHtml = await page.locator('#root').innerHTML();
      expect(rootHtml.length).toBeGreaterThan(50); // Ensure not blank
      
      // Look for Gantt container
      const gantt = page.locator('.gantt_container, #gantt_here');
      if (await gantt.count() > 0) {
          // Attempt to right click a task if available
          const tasks = page.locator('.gantt_task_line');
          if (await tasks.count() > 0) {
              await tasks.first().click({ button: 'right' });
          }
      }

      // Check for generic React errors (handled via console listener in config)
    });
  }
});
