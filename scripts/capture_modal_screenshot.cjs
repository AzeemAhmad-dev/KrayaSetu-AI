const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_2_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching Chromium for Discard Modal Verification Screenshot...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const testContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await testContext.newPage();

  // Log into PWAY
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.fill('input[type="text"]', 'PWAY-001');
  await page.fill('input[type="password"]', 'pway@demo');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Navigate to PWAY control
  await page.goto('http://localhost:5173/pway-control', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Switch to "Track / P.Way Control" tab
  const controlWorkspaceBtn = await page.getByRole('button', { name: /Track \/ P\.Way Control/i }).first();
  if (controlWorkspaceBtn) {
    await controlWorkspaceBtn.click();
    await page.waitForTimeout(600);
  }

  // Switch to "Issue Log" tab
  const issueLogTab = await page.getByRole('button', { name: /Issue Log/i }).first();
  if (issueLogTab) {
    await issueLogTab.click();
    await page.waitForTimeout(800);
  }

  // Click "Log Issue" button
  const logIssueBtn = await page.getByRole('button', { name: /Log Issue/i }).first();
  if (logIssueBtn) {
    await logIssueBtn.click();
    await page.waitForTimeout(600);

    // Fill in defect details
    const titleInput = await page.locator('input[placeholder*="Broken weld"], input[placeholder*="weld"], input[placeholder*="turnout"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Emergency Track Fracture at KM 849.2 Up Main');
    }

    const obsInput = await page.locator('textarea').first();
    if (await obsInput.isVisible()) {
      await obsInput.fill('Severe transverse fissure detected on outer rail head under 60kg section. Urgent possession requisitioned.');
    }
    await page.waitForTimeout(600);

    // Now attempt to logout from Navbar
    const logoutBtn = await page.locator('header').getByRole('button', { name: 'Logout' });
    await logoutBtn.click();
    await page.waitForTimeout(1000);

    // Capture screenshot showing the Discard Confirmation Modal!
    await page.screenshot({
      path: path.join(OUTPUT_DIR, '08_logout_unsaved_defect_modal.png'),
    });
    console.log('Saved screenshot: 08_logout_unsaved_defect_modal.png');
  } else {
    console.warn('Could not find Log Issue button');
  }

  await testContext.close();
  await browser.close();
  console.log('Modal screenshot capture complete!');
}

run().catch((err) => {
  console.error('Error during modal capture:', err);
  process.exit(1);
});
