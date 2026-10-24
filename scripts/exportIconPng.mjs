import { Browser, sleep } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function main() {
  console.log('Launching headless browser via CDP...');
  const browser = await Browser.launch({ width: 512, height: 512 });
  try {
    const page = await browser.newPage({ width: 512, height: 512, dsf: 2 });
    console.log('Navigating to icon standalone page...');
    await page.goto('http://localhost:5173/icon_standalone.html', { settleMs: 1500 });
    
    const targetPng = resolve('public/assets/icon_proposal_2.png');
    console.log('Capturing PNG to:', targetPng);
    await page.screenshot({ path: targetPng, format: 'png' });
    
    const artifactPng = 'C:\\Users\\Aleef Sabir\\.gemini\\antigravity\\brain\\e98bd6fd-4f7c-4f66-b22e-022224e9bcce\\icon_proposal_2.png';
    copyFileSync(targetPng, artifactPng);
    console.log('Successfully copied to artifact directory:', artifactPng);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
