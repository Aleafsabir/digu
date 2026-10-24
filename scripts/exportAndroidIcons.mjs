import { Browser, sleep } from '../.agents/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DENSITIES = [
  { name: 'mipmap-mdpi', fg: 108, legacy: 48 },
  { name: 'mipmap-hdpi', fg: 162, legacy: 72 },
  { name: 'mipmap-xhdpi', fg: 216, legacy: 96 },
  { name: 'mipmap-xxhdpi', fg: 324, legacy: 144 },
  { name: 'mipmap-xxxhdpi', fg: 432, legacy: 192 },
];

const RES_DIR = resolve('android/app/src/main/res');

async function main() {
  console.log('Connecting to headless browser for Android Icon multi-density export...');
  const browser = await Browser.launch({ width: 512, height: 512 });

  try {
    for (const d of DENSITIES) {
      const targetDir = join(RES_DIR, d.name);
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

      // 1. Export Foreground (Adaptive)
      console.log(`Generating ${d.name}/ic_launcher_foreground.png (${d.fg}x${d.fg})...`);
      const pageFg = await browser.newPage({ width: d.fg, height: d.fg });
      await pageFg.goto(`http://localhost:5173/icon_render_worker.html?type=foreground`, { settleMs: 1200 });
      await pageFg.screenshot({ path: join(targetDir, 'ic_launcher_foreground.png'), format: 'png' });
      await pageFg.close();

      // 2. Export Legacy Square/Squircle
      console.log(`Generating ${d.name}/ic_launcher.png (${d.legacy}x${d.legacy})...`);
      const pageSq = await browser.newPage({ width: d.legacy, height: d.legacy });
      await pageSq.goto(`http://localhost:5173/icon_render_worker.html?type=master`, { settleMs: 1200 });
      await pageSq.screenshot({ path: join(targetDir, 'ic_launcher.png'), format: 'png' });
      await pageSq.close();

      // 3. Export Legacy Round
      console.log(`Generating ${d.name}/ic_launcher_round.png (${d.legacy}x${d.legacy})...`);
      const pageRd = await browser.newPage({ width: d.legacy, height: d.legacy });
      await pageRd.goto(`http://localhost:5173/icon_render_worker.html?type=round`, { settleMs: 1200 });
      await pageRd.screenshot({ path: join(targetDir, 'ic_launcher_round.png'), format: 'png' });
      await pageRd.close();
    }

    console.log('All Android multi-density mipmaps successfully generated!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Android Icon Export failed:', err);
  process.exit(1);
});
