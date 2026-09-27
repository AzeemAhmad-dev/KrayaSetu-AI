const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_2_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const ROLES = [
  {
    id: 'coa',
    username: 'COA-001',
    pass: 'coa@demo',
    label: 'Chief of Block Operations (9 Items)',
    filename: '01_coa_shell_9_items.png',
  },
  {
    id: 'corridor',
    username: 'COR-001',
    pass: 'cor@demo',
    label: 'Corridor Master (6 Items)',
    filename: '02_corridor_master_shell_6_items.png',
  },
  {
    id: 'station',
    username: 'SM-001',
    pass: 'sm@demo',
    label: 'Station Master (3 Items)',
    filename: '03_station_master_shell_3_items.png',
  },
  {
    id: 'pway',
    username: 'PWAY-001',
    pass: 'pway@demo',
    label: 'Senior Section Engineer P.Way (2 Items)',
    filename: '04_pway_shell_2_items.png',
  },
  {
    id: 'snt',
    username: 'SNT-001',
    pass: 'snt@demo',
    label: 'Divisional Signal Engineer S&T (2 Items)',
    filename: '05_snt_shell_2_items.png',
  },
  {
    id: 'trd',
    username: 'TRD-001',
    pass: 'trd@demo',
    label: 'DEE Traction TRD (2 Items)',
    filename: '06_trd_shell_2_items.png',
  },
  {
    id: 'train',
    username: 'TRAIN-001',
    pass: 'train@demo',
    label: 'Train Pilot / Loco Pilot (1 Item)',
    filename: '07_train_pilot_shell_1_item.png',
  },
];

async function run() {
  console.log('Launching Chromium for Phase 2 Verification Screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  for (const role of ROLES) {
    console.log(`Processing Role: ${role.username} (${role.label})...`);

    // Create fresh context for each role to avoid session leakage
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    // Navigate to login
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Fill credentials
    await page.fill('input[type="text"]', role.username);
    await page.fill('input[type="password"]', role.pass);
    await page.click('button[type="submit"]');

    // Wait for redirection & sidebar
    await page.waitForTimeout(2000);
    await page.waitForSelector('aside');

    const screenshotPath = path.join(OUTPUT_DIR, role.filename);
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved screenshot: ${role.filename}`);

    // If Train Pilot, also capture a dedicated sidebar crop
    if (role.id === 'train') {
      const sidebarEl = await page.$('aside');
      if (sidebarEl) {
        await sidebarEl.screenshot({
          path: path.join(OUTPUT_DIR, '07b_train_pilot_sidebar_detail.png'),
        });
        console.log('Saved sidebar crop: 07b_train_pilot_sidebar_detail.png');
      }
    }

    if (role.id === 'coa') {
      const sidebarEl = await page.$('aside');
      if (sidebarEl) {
        await sidebarEl.screenshot({
          path: path.join(OUTPUT_DIR, '01b_coa_sidebar_detail.png'),
        });
        console.log('Saved sidebar crop: 01b_coa_sidebar_detail.png');
      }
    }

    await context.close();
  }

  // TEST LOGOUT WITH UNSAVED DEFECT FORM ON DEPARTMENT PAGE
  console.log('Testing Unsaved Defect Discard Confirmation Modal...');
  const testContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const testPage = await testContext.newPage();

  // Log into PWAY
  await testPage.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await testPage.fill('input[type="text"]', 'PWAY-001');
  await testPage.fill('input[type="password"]', 'pway@demo');
  await testPage.click('button[type="submit"]');
  await testPage.waitForTimeout(1500);

  // Navigate to PWAY control where Issue Log exists
  await testPage.goto('http://localhost:5173/pway-control', { waitUntil: 'domcontentloaded' });
  await testPage.waitForTimeout(1500);

  // Click "Log Issue" button to open defect form modal
  const logIssueBtn = await testPage.getByRole('button', { name: 'Log Issue' }).first();
  if (logIssueBtn) {
    await logIssueBtn.click();
    await testPage.waitForTimeout(600);

    // Type something in defect title and observation
    const titleInput = await testPage.locator('input[placeholder*="Broken weld"], input[placeholder*="weld"], input[placeholder*="turnout"]').first();
    if (await titleInput.isVisible()) {
      await titleInput.fill('Emergency Track Fracture at KM 849.2 Up Main');
    }
    const obsInput = await testPage.locator('textarea').first();
    if (await obsInput.isVisible()) {
      await obsInput.fill('Severe transverse fissure detected on outer rail head under 60kg section.');
    }
    await testPage.waitForTimeout(600);

    // Now attempt to logout from Navbar
    const logoutBtn = await testPage.locator('header').getByRole('button', { name: 'Logout' });
    await logoutBtn.click();
    await testPage.waitForTimeout(1000);

    // Capture screenshot showing the Discard Confirmation Modal!
    await testPage.screenshot({
      path: path.join(OUTPUT_DIR, '08_logout_unsaved_defect_modal.png'),
    });
    console.log('Saved screenshot: 08_logout_unsaved_defect_modal.png');
  }

  await testContext.close();
  await browser.close();
  console.log('Phase 2 screenshot capture complete!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
