const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_3_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const TEST_MATRIX = [
  {
    roleId: 'COA',
    username: 'COA-001',
    password: 'coa@demo',
    homeWorkspace: '/operations-control',
    authorized: ['/operations-control', '/block-planner', '/baseline-comparison', '/corridors'],
    unauthorized: [
      { path: '/pway-control', name: 'Civil Engineering (P.Way) Workspace' },
      { path: '/train-pilot', name: 'Train Pilot Workspace' },
      { path: '/trd-control', name: 'Traction & OHE (TRD) Workspace' },
    ],
  },
  {
    roleId: 'COR',
    username: 'COR-001',
    password: 'cor@demo',
    homeWorkspace: '/corridors',
    authorized: ['/corridors', '/control', '/marey-diagram', '/baseline-comparison'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/block-planner', name: 'CP-SAT Block Planning Engine' },
      { path: '/pway-control', name: 'Civil Engineering (P.Way) Workspace' },
    ],
  },
  {
    roleId: 'SM',
    username: 'SM-001',
    password: 'sm@demo',
    homeWorkspace: '/station-master',
    authorized: ['/station-master'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/corridors', name: 'Corridor Control Workspace' },
      { path: '/train-pilot', name: 'Train Pilot Workspace' },
    ],
  },
  {
    roleId: 'PWAY',
    username: 'PWAY-001',
    password: 'pway@demo',
    homeWorkspace: '/pway-control',
    authorized: ['/pway-control'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/snt-control', name: 'Signal & Interlocking (S&T) Workspace' },
      { path: '/train-pilot', name: 'Train Pilot Workspace' },
    ],
  },
  {
    roleId: 'SNT',
    username: 'SNT-001',
    password: 'snt@demo',
    homeWorkspace: '/snt-control',
    authorized: ['/snt-control'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/pway-control', name: 'Civil Engineering (P.Way) Workspace' },
      { path: '/trd-control', name: 'Traction & OHE (TRD) Workspace' },
    ],
  },
  {
    roleId: 'TRD',
    username: 'TRD-001',
    password: 'trd@demo',
    homeWorkspace: '/trd-control',
    authorized: ['/trd-control'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/snt-control', name: 'Signal & Interlocking (S&T) Workspace' },
      { path: '/train-pilot', name: 'Train Pilot Workspace' },
    ],
  },
  {
    roleId: 'TRAIN',
    username: 'TRAIN-001',
    password: 'train@demo',
    homeWorkspace: '/train-pilot',
    authorized: ['/train-pilot'],
    unauthorized: [
      { path: '/operations-control', name: 'Divisional Operations Control' },
      { path: '/corridors', name: 'Corridor Control Workspace' },
      { path: '/block-planner', name: 'CP-SAT Block Planning Engine' },
    ],
  },
];

async function run() {
  console.log('Starting Phase 3 Access-Matrix Verification with Playwright...\n');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const results = [];

  for (const suite of TEST_MATRIX) {
    console.log(`========================================================================`);
    console.log(`TESTING ROLE: ${suite.roleId} (${suite.username})`);
    console.log(`========================================================================`);

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // 1. Log in
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="text"]', suite.username);
    await page.fill('input[type="password"]', suite.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1500);

    // Verify authorized routes
    for (const authRoute of suite.authorized) {
      process.stdout.write(`  [AUTHORIZED] Testing ${authRoute} ... `);
      await page.goto(`http://localhost:5173${authRoute}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Check if UnauthorizedWorkspace is visible (should NOT be visible)
      const unauthorizedHeading = await page.locator('text="Workspace Access Boundary"').count();
      const hasNavbar = (await page.locator('header').count()) > 0;
      const hasSidebar = (await page.locator('aside').count()) > 0;

      if (unauthorizedHeading === 0 && hasNavbar && hasSidebar) {
        console.log(`PASSED (Authorized access granted, shell visible)`);
        results.push({ role: suite.roleId, route: authRoute, type: 'authorized', passed: true });
      } else {
        console.log(`FAILED! Unauthorized state unexpectedly shown or shell missing.`);
        results.push({ role: suite.roleId, route: authRoute, type: 'authorized', passed: false });
      }
    }

    // Verify unauthorized routes (at least 2 per role)
    for (let i = 0; i < suite.unauthorized.length; i++) {
      const target = suite.unauthorized[i];
      process.stdout.write(`  [UNAUTHORIZED] Testing ${target.path} (${target.name}) ... `);
      await page.goto(`http://localhost:5173${target.path}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Check for canonical UnauthorizedWorkspace components
      const headingCount = await page.locator('text="Workspace Access Boundary"').count();
      const roleMentionCount = await page.locator(`text="${suite.username}"`).count();
      const returnBtn = await page.locator('button:has-text("Return to")').first();
      const hasReturnBtn = (await returnBtn.count()) > 0;
      const hasNavbar = (await page.locator('header').count()) > 0;
      const hasSidebar = (await page.locator('aside').count()) > 0;

      const isCompliant = headingCount > 0 && roleMentionCount > 0 && hasReturnBtn && hasNavbar && hasSidebar;

      if (isCompliant) {
        console.log(`PASSED (Guard fired correctly, canonical UI inside shell)`);
        results.push({ role: suite.roleId, route: target.path, type: 'unauthorized', passed: true });

        // Save screenshot for report
        const screenshotName = `${suite.roleId.toLowerCase()}_unauthorized_${target.path.replace(/[\/:]/g, '_')}.png`;
        await page.screenshot({ path: path.join(OUTPUT_DIR, screenshotName) });
      } else {
        console.log(`FAILED! Heading=${headingCount}, RoleMention=${roleMentionCount}, ReturnBtn=${hasReturnBtn}, Nav=${hasNavbar}, Side=${hasSidebar}`);
        results.push({ role: suite.roleId, route: target.path, type: 'unauthorized', passed: false });
      }

      // Test return button if first unauthorized route
      if (i === 0 && hasReturnBtn) {
        process.stdout.write(`    ↳ Testing "Return to Home Workspace" button action ... `);
        await returnBtn.click();
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        const returnedHome = currentUrl.includes(suite.homeWorkspace);
        if (returnedHome) {
          console.log(`PASSED (Successfully returned to ${suite.homeWorkspace})`);
        } else {
          console.log(`FAILED (Expected URL to contain ${suite.homeWorkspace}, got ${currentUrl})`);
        }
      }
    }

    await context.close();
    console.log('');
  }

  await browser.close();

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  console.log(`\n========================================================================`);
  console.log(`FINAL RESULT: ${passed}/${total} test checks passed across all 7 roles.`);
  console.log(`========================================================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
