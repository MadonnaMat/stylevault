import { expect, test } from '@playwright/test';

test('add an item, creating a category (with slot) and a brand inline, then see it in the closet', async ({ page }) => {
  await page.goto('/closet');
  await page.getByRole('link', { name: /Add (your first )?item/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Add an item' })).toBeVisible();

  await page.getByRole('textbox', { name: 'Name' }).fill('Navy wool blazer');

  await page.getByRole('combobox', { name: 'Category' }).fill('Cardigans');
  await page.getByRole('option', { name: "Create 'Cardigans'" }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('New category: Cardigans');
  await dialog.getByRole('radio', { name: 'Top' }).check();
  await dialog.getByRole('button', { name: 'Create' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('combobox', { name: 'Category' })).toHaveValue('Cardigans');

  await page.getByRole('combobox', { name: 'Brand' }).fill('Patagonia');
  await page.getByRole('option', { name: "Create 'Patagonia'" }).click();
  await expect(page.getByRole('combobox', { name: 'Brand' })).toHaveValue('Patagonia');

  await page.getByRole('textbox', { name: 'Primary color', exact: true }).fill('#1F2A44');
  await page.getByRole('button', { name: 'Add to closet' }).click();

  // Lands on the new item's details.
  await expect(page.getByRole('heading', { name: 'Navy wool blazer' })).toBeVisible();
  await expect(page.locator('.category')).toContainText('Cardigans');
  await expect(page.locator('.slot')).toHaveText('Top');

  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Closet' }).click();
  const entry = page.getByRole('list', { name: 'Closet items' }).getByRole('listitem').filter({ hasText: 'Navy wool blazer' });
  await expect(entry).toBeVisible();
  await expect(entry).toContainText('Cardigans');
  await expect(entry).toContainText('Patagonia');
  await expect(entry.getByRole('img', { name: 'Primary color #1f2a44' })).toBeVisible();
});
