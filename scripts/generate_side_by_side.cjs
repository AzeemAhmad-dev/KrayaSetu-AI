const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 850, height: 980 } });

  const coaImg = fs.readFileSync(path.resolve(__dirname, '../phase_2_screenshots/01b_coa_sidebar_detail.png')).toString('base64');
  const trainImg = fs.readFileSync(path.resolve(__dirname, '../phase_2_screenshots/07b_train_pilot_sidebar_detail.png')).toString('base64');

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: system-ui, sans-serif; background: #0b1528; color: white; padding: 24px; margin: 0; box-sizing: border-box; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
          .subtitle { font-size: 12px; color: #94a3b8; font-family: monospace; margin-top: 4px; }
          .container { display: flex; justify-content: center; gap: 24px; }
          .card { background: #f8fafc; border-radius: 12px; padding: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .card-title { font-size: 11px; font-weight: 800; color: #0b2545; text-align: center; margin-bottom: 8px; font-family: monospace; text-transform: uppercase; }
          img { border-radius: 8px; border: 1px solid #cbd5e1; display: block; height: 830px; width: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Phase 2 Global Shell: Sidebar Proportional Scaling</div>
          <div class="subtitle">COA (9 Nav Items — Dense) vs. Train Pilot (1 Nav Item — Scaled Safety Directive)</div>
        </div>
        <div class="container">
          <div class="card">
            <div class="card-title">COA-001 (9 Nav Items)</div>
            <img src="data:image/png;base64,${coaImg}" />
          </div>
          <div class="card">
            <div class="card-title">TRAIN-001 (1 Nav Item)</div>
            <img src="data:image/png;base64,${trainImg}" />
          </div>
        </div>
      </body>
    </html>
  `);

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.resolve(__dirname, '../phase_2_screenshots/09_side_by_side_coa_vs_train_pilot.png') });
  console.log('Saved side-by-side comparison screenshot: 09_side_by_side_coa_vs_train_pilot.png');
  await browser.close();
}

run().catch((err) => {
  console.error('Error generating side-by-side image:', err);
  process.exit(1);
});
