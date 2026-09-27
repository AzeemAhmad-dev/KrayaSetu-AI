const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_4_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('Launching Chrome for Phase 4 verification screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  // 1. Log in as COA-001
  console.log('Logging in as COA-001...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.fill('input[type="text"]', 'COA-001');
  await page.fill('input[type="password"]', 'coa@demo');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.waitForSelector('aside');

  // 2. Control Dashboard - Master Network Map
  console.log('Capturing 01_control_master_map.png (/control)...');
  await page.goto('http://localhost:5173/control', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=BHOPAL DIVISION RAILWAY NETWORK', { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_control_master_map.png') });

  // 2b. Control Dashboard - Corridor Directory Tab
  console.log('Capturing 01b_control_corridor_directory_tab.png...');
  await page.goto('http://localhost:5173/control?tab=corridors', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01b_control_corridor_directory_tab.png') });

  // 2c. Control Dashboard - Visual Junction Hubs Tab
  console.log('Capturing 01c_control_visual_junctions_tab.png...');
  await page.goto('http://localhost:5173/control?tab=junctions', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01c_control_visual_junctions_tab.png') });

  // 3. Corridors Directory
  console.log('Capturing 02_corridors_directory.png (/corridors)...');
  await page.goto('http://localhost:5173/corridors', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_corridors_directory.png') });

  // 4. Corridor Detail (CORR-01)
  console.log('Capturing 03_corridor_detail.png (/corridors/CORR-01)...');
  await page.goto('http://localhost:5173/corridors/CORR-01', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_corridor_detail.png') });

  // 4b. Dedicated snapshot of the schematic area with default banner
  console.log('Capturing 03b_corridor_detail_default_banner.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03b_corridor_detail_default_banner.png'), fullPage: true });

  // 5. Station Master (BPL)
  console.log('Capturing 04_station_master_schematic.png (/station-master/BPL)...');
  await page.goto('http://localhost:5173/station-master/BPL', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_station_master_schematic.png') });

  // 5b. Station Master (RKMP)
  console.log('Capturing 04b_station_master_rkmp.png (/station-master/RKMP)...');
  await page.goto('http://localhost:5173/station-master/RKMP', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04b_station_master_rkmp.png') });

  await browser.close();
  console.log('All Phase 4 screenshots captured successfully!');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
