const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_coa_fixes_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching browser for verification screenshots...');
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    });
  } catch (e) {
    browser = await chromium.launch({ headless: true });
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
  });
  const page = await context.newPage();

  // Helper to log in
  console.log('Logging in...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.fill('input[type="text"]', 'COA-001');
  await page.fill('input[type="password"]', 'demo123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('aside', { timeout: 15000 });
  console.log('Logged in successfully.');

  // Set theme to light
  await page.evaluate(() => {
    localStorage.setItem('krayasetu_theme', 'light');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  });

  // 1. Operations Control Home — All Tasks & Tier Counts
  console.log('1. Capturing Operations Control Home with Harmonized Tier Counts...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_priority_badges_and_queue.png'), fullPage: false });

  // 2. Filter by CRITICAL
  console.log('2. Filtering by CRITICAL tier...');
  const critTab = await page.getByRole('button', { name: /^CRITICAL/ });
  if (await critTab.count() > 0) {
    await critTab.first().click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_tier_filter_critical.png'), fullPage: false });

  // 3. Filter by LOW
  console.log('3. Filtering by LOW tier...');
  const lowTab = await page.getByRole('button', { name: /^LOW/ });
  if (await lowTab.count() > 0) {
    await lowTab.first().click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_tier_filter_low.png'), fullPage: false });

  // 4. Block Planner — 24-Hour Horizon & Timeline
  console.log('4. Navigating to Block Planner (24-Hour Operational Horizon)...');
  await page.goto('http://localhost:5173/block-planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_block_planner_24h_horizon.png'), fullPage: false });

  // 5. Marey Diagram — 24h Blocks & Paths
  console.log('5. Navigating to Marey Diagram...');
  await page.goto('http://localhost:5173/marey-diagram', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_marey_diagram_24h_blocks.png'), fullPage: false });

  console.log('All screenshots captured successfully in phase_coa_fixes_screenshots/');
  await browser.close();
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
