import { expect, test } from '@playwright/test';

test('deleting a category that an item uses shows "Used by 1 item" and keeps the category', async ({ page, request }) => {
  const category = await (await request.post('/api/categories', { data: { name: 'Shirts', slot: 'top' } })).json();
  const created = await request.post('/api/items', {
    data: { name: 'Oxford shirt', categoryId: category.id, primaryColor: '#fff' },
  });
  expect(created.status()).toBe(201);

  await page.goto('/categories');
  const row = page.getByRole('list', { name: 'Categories' }).getByRole('listitem').filter({ hasText: 'Shirts' });
  await row.getByRole('button', { name: 'Delete Shirts' }).click();

  await expect(page.getByText('Used by 1 item')).toBeVisible();
  await expect(row).toBeVisible();
  const categories = await (await request.get('/api/categories')).json();
  expect(categories.map((c: { name: string }) => c.name)).toContain('Shirts');
});
