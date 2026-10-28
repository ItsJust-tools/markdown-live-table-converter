import { test, expect } from '@playwright/test';

async function closeBackdropIfOpen(page: import('@playwright/test').Page) {
  const backdrop = page.locator('.sidebar-backdrop');
  for (let i = 0; i < 3; i++) {
    const visible = await backdrop.isVisible().catch(() => false);
    if (!visible) return;
    await backdrop.evaluate((el) => (el as HTMLElement).click());
    await page.waitForTimeout(100);
  }
}

async function ensureToolbarInteractable(page: import('@playwright/test').Page) {
  await closeBackdropIfOpen(page);
  const backdrop = page.locator('.sidebar-backdrop');
  if (await backdrop.isVisible().catch(() => false)) {
    await page.keyboard.press('Control+b');
    await expect(backdrop).toBeHidden();
  }
}

async function fillInput(page: import('@playwright/test').Page, text: string) {
  await ensureToolbarInteractable(page);
  const textarea = page.locator('.mtc-textarea');
  await textarea.fill(text);
}

test('tool loads with correct title', async ({ page }) => {
  await page.goto('/');
  const title = await page.title();
  expect(title).toContain('Markdown');
});

test('textarea is editable', async ({ page }) => {
  await page.goto('/');
  const textarea = page.locator('.mtc-textarea');
  await textarea.fill('name,role\nAda,Engineer');
  await expect(textarea).toHaveValue('name,role\nAda,Engineer');
});

test('CSV input renders a preview table and markdown output', async ({ page }) => {
  await page.goto('/');
  await fillInput(page, 'name,role\nAda,Engineer\nGrace,Admiral');

  const preview = page.locator('.mtc-table');
  await expect(preview).toBeVisible();
  await expect(preview.locator('thead th')).toHaveCount(2);
  await expect(preview.locator('tbody tr')).toHaveCount(2);

  const markdown = page.locator('.mtc-markdown');
  await expect(markdown).toContainText('| name');
  await expect(markdown).toContainText(':---');
});

test('JSON array of objects produces headers from keys', async ({ page }) => {
  await page.goto('/');
  await fillInput(page, '[{"id":1,"label":"alpha"},{"id":2,"label":"beta"}]');

  const headers = page.locator('.mtc-table thead th');
  await expect(headers).toHaveCount(2);
  await expect(headers.nth(0)).toContainText('id');
  await expect(headers.nth(1)).toContainText('label');
});

test('clicking a header sorts the preview', async ({ page }) => {
  await page.goto('/');
  await fillInput(page, 'n\n2\n1\n3');

  const firstColumn = page.locator('.mtc-table tbody tr td:first-child');
  await expect(firstColumn.nth(0)).toHaveText('2');

  await page.getByRole('button', { name: /n: Sort ascending/ }).click();
  await expect(firstColumn.nth(0)).toHaveText('1');
  await expect(firstColumn.nth(2)).toHaveText('3');
});

test('alignment buttons change the markdown delimiter row', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  await fillInput(page, 'a,b\n1,2');

  await page.getByRole('button', { name: 'Align columns center' }).click();
  await expect(page.locator('.mtc-markdown')).toContainText(':---:');

  await page.getByRole('button', { name: 'Align columns right' }).click();
  await expect(page.locator('.mtc-markdown')).toContainText('---:');
});

test('sample presets load into the input', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  await page.getByRole('button', { name: /Inventory \(TSV\)/ }).click();
  await expect(page.locator('.mtc-textarea')).toHaveValue(/SKU/);
  await expect(page.locator('.mtc-table thead th').nth(0)).toContainText('SKU');
});

test('undo/redo buttons enable/disable correctly', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);

  const undoButton = page.getByRole('button', { name: 'Undo (Ctrl+Z)' });
  const redoButton = page.getByRole('button', { name: 'Redo (Ctrl+Y)' });
  await expect(undoButton).toBeDisabled();
  await expect(redoButton).toBeDisabled();

  await fillInput(page, 'a,b\n1,2');

  await expect(undoButton).toBeEnabled();
  await expect(redoButton).toBeDisabled();
});

test('export dropdown opens and shows JSON format', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const exportButton = page.getByRole('button', { name: /export/i });
  await exportButton.click({ force: true });
  const menu = page.getByRole('listbox');
  await expect(menu).toBeVisible();
  await expect(page.getByRole('option', { name: /JSON/ })).toBeVisible();
  await page.click('body');
  await expect(menu).not.toBeVisible();
});

test('sidebar toggle button works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const sidebarToggle = page.locator('.toolbar-btn-sidebar');
  const sidebar = page.locator('.tool-shell-sidebar');
  const viewport = page.viewportSize();
  const mobile = viewport !== null && viewport.width <= 768;
  const isCollapsed = await sidebar.evaluate((el) => el.classList.contains('collapsed'));
  if (isCollapsed) {
    await sidebarToggle.click();
    await expect(sidebar).toHaveClass(/open/);
    if (mobile) {
      await page.locator('.sidebar-backdrop').click();
    } else {
      await sidebarToggle.click();
    }
    await expect(sidebar).toHaveClass(/collapsed/);
    return;
  }
  await expect(sidebar).toHaveClass(/open/);
  if (mobile) {
    await page.locator('.sidebar-backdrop').click();
  } else {
    await sidebarToggle.click();
  }
  await expect(sidebar).toHaveClass(/collapsed/);
});

test('dark mode toggle works', async ({ page }) => {
  await page.goto('/');
  await ensureToolbarInteractable(page);
  const themeButton = page.getByRole('button', { name: /Switch to dark mode/i });
  if (await themeButton.isVisible()) {
    await themeButton.click();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    const lightButton = page.getByRole('button', { name: /Switch to light mode/i });
    await lightButton.click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  }
});

test('SEO meta tags are present', async ({ page }) => {
  await page.goto('/');

  const title = await page.title();
  expect(title).toBeTruthy();

  const description = await page.getAttribute('meta[name="description"]', 'content');
  expect(description).toBeTruthy();

  const ogTitle = await page.getAttribute('meta[property="og:title"]', 'content');
  expect(ogTitle).toBeTruthy();

  const ogImage = await page.getAttribute('meta[property="og:image"]', 'content');
  expect(ogImage).toBeTruthy();

  const canonical = await page.getAttribute('link[rel="canonical"]', 'href');
  expect(canonical).toBeTruthy();
});

test('JSON-LD structured data is present', async ({ page }) => {
  await page.goto('/');
  const jsonLd = page.locator('script[type="application/ld+json"]').first();
  const content = await jsonLd.textContent();
  const parsed = JSON.parse(content!);
  expect(parsed['@type']).toBe('WebApplication');
  expect(parsed.name).toBeTruthy();
  expect(parsed.offers.price).toBe('0');
});

test('sitemap.xml is accessible', async ({ page }) => {
  const response = await page.goto('/sitemap.xml');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toContain('urlset');
});

test('robots.txt is accessible', async ({ page }) => {
  const response = await page.goto('/robots.txt');
  expect(response?.ok()).toBe(true);
  const content = await response?.text();
  expect(content).toMatch(/User-[Aa]gent/);
});

test('keyboard shortcuts overlay opens and closes', async ({ page, browserName }) => {
  if (browserName !== 'chromium') return;
  await page.goto('/');
  await ensureToolbarInteractable(page);
  await page.getByRole('button', { name: /keyboard shortcuts/i }).click({ force: true });
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
