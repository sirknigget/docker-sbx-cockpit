import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request, page }) => {
  await request.post('/__fixture/reset');
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'atlas-api', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test('fixture inventory has deterministic screenshot', async ({ page }) => {
  await expect(
    page.getByText('/workspace/atlas-api', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Bash shell', { exact: false })).toBeVisible();
  await expect(page).toHaveScreenshot('sandboxes-inventory.png');
});

test('create dialog has deterministic screenshot', async ({ page }) => {
  await page
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Create sandbox' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('create-sandbox.png');
});

test('creates pure shell with writable and read-only mounts', async ({
  page,
  request,
}) => {
  await page
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Create sandbox' });

  await dialog.getByLabel('Name', { exact: true }).fill('fixture-created');
  await dialog.getByRole('combobox', { name: /Agent/ }).selectOption('shell');
  await dialog
    .getByLabel('Workspace mounts')
    .fill('/workspace/project\n/workspace/reference:ro');
  await dialog
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'fixture-created', exact: true }),
  ).toBeVisible();
  expect(
    await (await request.get('/__fixture/commands')).json(),
  ).toContainEqual([
    'create',
    '--name',
    'fixture-created',
    'shell',
    '/workspace/project',
    '/workspace/reference:ro',
  ]);
});

test('stop and delete require confirmation and update inventory', async ({
  page,
  request,
}) => {
  await page
    .getByRole('button', { name: 'Stop atlas-api', exact: true })
    .click();

  const stop = page.getByRole('dialog', { name: 'Stop atlas-api?' });

  await expect(stop).toBeVisible();
  await stop.getByRole('button', { name: 'Stop sandbox', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Stop atlas-api', exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole('button', { name: 'Delete shell-tools', exact: true })
    .click();

  const remove = page.getByRole('dialog', { name: 'Delete shell-tools?' });

  await expect(
    remove.getByText('This cannot be undone.', { exact: false }),
  ).toBeVisible();
  await remove
    .getByRole('button', { name: 'Delete sandbox', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'shell-tools', exact: true }),
  ).not.toBeVisible();

  const commands = await (await request.get('/__fixture/commands')).json();

  expect(commands).toContainEqual(['stop', 'atlas-api']);
  expect(commands).toContainEqual(['rm', '--force', 'shell-tools']);
});

test('CLI failure stays visible and creation dialog remains editable', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();

  const dialog = page.getByRole('dialog', { name: 'Create sandbox' });

  await dialog.getByLabel('Name', { exact: true }).fill('fail-create');
  await dialog
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toHaveText(
    'Fixture daemon unavailable. Try again.',
  );
  await expect(dialog.getByLabel('Name', { exact: true })).toBeEnabled();
});
