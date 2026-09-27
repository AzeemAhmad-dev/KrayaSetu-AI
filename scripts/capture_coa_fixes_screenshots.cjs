const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'phase_coa_fixes_screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser for Phase COA Fixes Verification Screenshots...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Step 1: Login as Chief Operations Manager (COA-001)
  console.log('Navigating to login...');
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('input[type="text"]', 'COA-001');
  await page.fill('input[type="password"]', 'coa@demo');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Step 2: Operations Control Home - Priority Queue Full Table View
  console.log('Navigating to /operations-control...');
  await page.goto('http://localhost:5173/operations-control', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Scroll directly to the Priority Queue section
  const priorityHeader = page.locator('text=OPERATIONAL PRIORITY QUEUE — S-R-C-A-O INTELLIGENCE');
  await priorityHeader.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);

  await page.screenshot({
    path: path.join(OUTPUT_DIR, '01_priority_queue_all_tasks.png'),
    fullPage: false,
  });
  console.log('Saved: 01_priority_queue_all_tasks.png');

  // Step 3: Open "Why this task?" modal (BlockReasoningModal) and verify it's not clipped by Navbar
  console.log('Opening "Why this task?" modal...');
  const whyBtn = page.getByRole('button', { name: /Why this task\?/i }).first();
  if (whyBtn) {
    await whyBtn.click();
    await page.waitForTimeout(1200);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '02_block_reasoning_modal_visible.png'),
      fullPage: false,
    });
    console.log('Saved: 02_block_reasoning_modal_visible.png');

    // Close modal
    const closeBtn = page.locator('button:has-text("Close Reasoning")').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Step 4: Block Planner - Run Live CP-SAT Optimizer and wait for completion
  console.log('Navigating to /block-planner without sim params...');
  await page.goto('http://localhost:5173/block-planner', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  console.log('Clicking "Run CP-SAT Optimizer"...');
  const runOptBtn = page.getByRole('button', { name: /Run CP-SAT Optimizer/i }).first();
  if (runOptBtn) {
    await runOptBtn.click();
    // Bounded CP-SAT solver completes in ~8-10 seconds
    console.log('Waiting 10s for solver to finalize schedule...');
    await page.waitForTimeout(11000);

    // Scroll to schedule results section
    const scheduleHeader = page.locator('text=Corridor Maintenance Schedule').first();
    if (await scheduleHeader.isVisible()) {
      await scheduleHeader.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
    }

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '03_cpsat_solver_optimal_run.png'),
      fullPage: false,
    });
    console.log('Saved: 03_cpsat_solver_optimal_run.png');
  }

  // Step 5: Test simulator button and banner
  console.log('Testing simulator mode banner...');
  const infeasibleBtn = page.getByRole('button', { name: /INFEASIBLE/i }).first();
  if (infeasibleBtn) {
    await infeasibleBtn.scrollIntoViewIfNeeded();
    await infeasibleBtn.click();
    await page.waitForTimeout(1000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, '04_simulator_banner_infeasible.png'),
      fullPage: false,
    });
    console.log('Saved: 04_simulator_banner_infeasible.png');

    // Click "● LIVE SOLVER" button to exit simulation
    const liveSolverBtn = page.getByRole('button', { name: /● LIVE SOLVER/i }).first();
    if (liveSolverBtn) {
      await liveSolverBtn.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: path.join(OUTPUT_DIR, '05_exited_simulation_live_optimal.png'),
        fullPage: false,
      });
      console.log('Saved: 05_exited_simulation_live_optimal.png');
    }
  }

  await browser.close();
  console.log('All verification screenshots captured successfully!');
}

run().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
