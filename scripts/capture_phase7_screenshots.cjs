const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_7_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function login(page, username, password) {
  console.log(`Logging in as ${username}...`);
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.waitForSelector('input[type="text"]', { timeout: 10000 });
  await page.fill('input[type="text"]', username);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  await page.waitForSelector('aside', { timeout: 10000 });
}

async function capture() {
  console.log('Launching Chrome for Phase 7 screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });
  const page = await context.newPage();

  // =========================================================================
  // SURFACE 1: P.WAY CONTROL (/pway-control)
  // =========================================================================
  console.log('\n--- SURFACE 1: P.WAY CONTROL ---');
  await login(page, 'PWAY-001', 'pway@demo');
  await page.goto('http://localhost:5173/pway-control', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  
  // Light mode screenshot
  console.log('Capturing 01_pway_control_light.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_pway_control_light.png') });

  // Toggle Dark Mode
  console.log('Toggling dark mode...');
  const pwayThemeBtn = await page.$('button:has-text("Dark Mode")');
  if (pwayThemeBtn) {
    await pwayThemeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 01b_pway_control_dark.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01b_pway_control_dark.png') });
    // Toggle back to light
    const pwayLightBtn = await page.$('button:has-text("Light Mode")');
    if (pwayLightBtn) await pwayLightBtn.click();
  }

  // =========================================================================
  // SURFACE 2: SIGNAL & S&T CONTROL (/snt-control)
  // =========================================================================
  console.log('\n--- SURFACE 2: SIGNAL & S&T CONTROL ---');
  await login(page, 'SNT-001', 'snt@demo');
  await page.goto('http://localhost:5173/snt-control', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Light mode screenshot
  console.log('Capturing 02_snt_control_light.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_snt_control_light.png') });

  // Toggle Dark Mode
  console.log('Toggling dark mode...');
  const sntThemeBtn = await page.$('button:has-text("Dark Mode")');
  if (sntThemeBtn) {
    await sntThemeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 02b_snt_control_dark.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '02b_snt_control_dark.png') });
    const sntLightBtn = await page.$('button:has-text("Light Mode")');
    if (sntLightBtn) await sntLightBtn.click();
  }

  // =========================================================================
  // SURFACE 3: ELECTRICAL TRD CONTROL (/trd-control)
  // =========================================================================
  console.log('\n--- SURFACE 3: ELECTRICAL TRD CONTROL ---');
  await login(page, 'TRD-001', 'trd@demo');
  await page.goto('http://localhost:5173/trd-control', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Light mode screenshot
  console.log('Capturing 03_trd_control_light.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_trd_control_light.png') });

  // Toggle Dark Mode
  console.log('Toggling dark mode...');
  const trdThemeBtn = await page.$('button:has-text("Dark Mode")');
  if (trdThemeBtn) {
    await trdThemeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 03b_trd_control_dark.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '03b_trd_control_dark.png') });
    const trdLightBtn = await page.$('button:has-text("Light Mode")');
    if (trdLightBtn) await trdLightBtn.click();
  }

  // =========================================================================
  // SURFACE 4: TRAIN PILOT WORKSPACE (/train-pilot)
  // =========================================================================
  console.log('\n--- SURFACE 4: TRAIN PILOT WORKSPACE ---');
  await login(page, 'TRAIN-001', 'train@demo');
  await page.goto('http://localhost:5173/train-pilot', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Light mode screenshot
  console.log('Capturing 04_train_pilot_light.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04_train_pilot_light.png') });

  // Switch to Log En-Route Observation tab to show before action
  const logTab = await page.$('button:has-text("Log En-Route Observation")');
  if (logTab) {
    await logTab.click();
    await page.waitForTimeout(800);
  }
  console.log('Capturing 04c_train_pilot_action_before.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04c_train_pilot_action_before.png') });

  // Fill in observation form & submit
  console.log('Filling observation form...');
  await page.fill('input[placeholder*="Outer yard"]', 'Near Up Loop Turnout #12');
  await page.fill('input[placeholder*="KM 824"]', '126.8');
  await page.fill('input[placeholder*="Up Line between"]', 'Bhopal – Habibganj (RKMP) Line');
  await page.fill('textarea[placeholder*="Describe what you observed"]', 'Observed slight OHE spark and track surface roughness on UP mainline prior to signal S-42.');
  
  // Check P.Way department checkbox
  const pwayCheckbox = await page.$('input[type="checkbox"]');
  if (pwayCheckbox) await pwayCheckbox.check();

  console.log('Submitting observation...');
  const submitBtn = await page.$('button:has-text("Log Activity")');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }
  console.log('Capturing 04d_train_pilot_action_after.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '04d_train_pilot_action_after.png') });

  // Toggle Dark Mode
  console.log('Toggling dark mode on Train Pilot...');
  const pilotThemeBtn = await page.$('button:has-text("Dark Mode")');
  if (pilotThemeBtn) {
    await pilotThemeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 04b_train_pilot_dark.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04b_train_pilot_dark.png') });
    const pilotLightBtn = await page.$('button:has-text("Light Mode")');
    if (pilotLightBtn) await pilotLightBtn.click();
  }

  // =========================================================================
  // SURFACE 5: STATION MASTER BLOCK WORKSPACE (/station-master/RKMP?tab=block)
  // =========================================================================
  console.log('\n--- SURFACE 5: STATION MASTER BLOCK WORKSPACE ---');
  await login(page, 'SM-001', 'sm@demo');
  await page.goto('http://localhost:5173/station-master/RKMP?tab=block', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Light mode screenshot
  console.log('Capturing 05_station_master_block_light.png...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_station_master_block_light.png') });

  // Switch to Issue / Block Request sub-tab
  console.log('Switching to Issue / Block Request sub-tab...');
  const issueTab = await page.$('button:has-text("Issue / Block Request")');
  if (issueTab) {
    await issueTab.click();
    await page.waitForTimeout(800);
  }

  // Open Requisition Modal
  console.log('Opening Requisition Modal...');
  const openModalBtn = await page.$('button:has-text("Submit Issue / Block Request")');
  if (openModalBtn) {
    await openModalBtn.click();
    await page.waitForTimeout(800);
    console.log('Capturing 05c_station_master_block_request_modal.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05c_station_master_block_request_modal.png') });

    // Fill Modal form
    console.log('Filling Requisition Modal form...');
    await page.fill('input[placeholder*="Sluggish"]', 'Track Geometry Irregularity at Platform 2 Loop');
    await page.fill('input[placeholder*="Turnout 101B"]', 'Turnout 102A');
    await page.fill('textarea[placeholder*="Detail the physical"]', 'Platform 2 loop turnout #102 shows lateral alignment deviation observed during freight bypass. Requisitioning 90 min emergency tamping block.');

    console.log('Submitting Requisition...');
    const submitReqBtn = await page.$('button:has-text("Submit Issue & Block Requisition")');
    if (submitReqBtn) {
      await submitReqBtn.click();
      await page.waitForTimeout(2000);
    }
    console.log('Capturing 05d_station_master_block_request_submitted.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05d_station_master_block_request_submitted.png') });
  }

  // Toggle Dark Mode
  console.log('Toggling dark mode on Station Master...');
  const smThemeBtn = await page.$('button:has-text("Dark Mode")');
  if (smThemeBtn) {
    await smThemeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Capturing 05b_station_master_block_dark.png...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '05b_station_master_block_dark.png') });
  }

  await browser.close();
  console.log('\n===========================================');
  console.log('All Phase 7 screenshots captured successfully!');
  console.log('===========================================');
}

capture().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
