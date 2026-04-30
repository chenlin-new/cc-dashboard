import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'screenshots')
const BASE = 'http://localhost:5173'

const pages = [
  { path: '/', file: 'dashboard.png', wait: 2000 },
  { path: '/chat', file: 'chat.png', wait: 1500 },
  { path: '/tasks', file: 'tasks.png', wait: 1500 },
  { path: '/mcp', file: 'mcp.png', wait: 1500 },
  { path: '/sessions', file: 'sessions.png', wait: 1500 },
]

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })

  for (const { path: pagePath, file, wait } of pages) {
    console.log(`Screenshotting ${pagePath} → ${file}`)
    const page = await context.newPage()
    try {
      await page.goto(`${BASE}${pagePath}`, { waitUntil: 'networkidle', timeout: 15000 })
      await page.waitForTimeout(wait)
      await page.screenshot({ path: path.join(outDir, file), fullPage: false })
      console.log(`  ✓ ${file}`)
    } catch (e) {
      console.error(`  ✗ ${file}: ${e.message}`)
    } finally {
      await page.close()
    }
  }

  // Screenshot theme picker
  console.log('Screenshotting theme picker...')
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 15000 })
    await page.waitForTimeout(1500)
    // Click theme button in sidebar to open picker
    const themeBtn = page.locator('button').filter({ hasText: '' }).locator('..').filter({ has: page.locator('svg.lucide-palette') })
    // Try clicking the button that contains Palette icon
    const paletteIcon = page.locator('svg.lucide-palette')
    if (await paletteIcon.count() > 0) {
      await paletteIcon.click()
      await page.waitForTimeout(500)
    }
    await page.screenshot({ path: path.join(outDir, 'themes.png'), fullPage: false })
    console.log('  ✓ themes.png')
  } catch (e) {
    console.error(`  ✗ themes.png: ${e.message}`)
  } finally {
    await page.close()
  }

  await browser.close()
  console.log('Done!')
}

main().catch(e => { console.error(e); process.exit(1) })
