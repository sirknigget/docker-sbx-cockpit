import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request, page }) => {
  await request.post('/__fixture/reset');
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'atlas-api', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test('templates inventory screenshot and creation from a saved template', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await expect(page.getByText('team/node-base', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('templates.png');
  await page
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Create sandbox' });
  await expect(dialog.getByLabel('Template (optional)')).toHaveValue(
    'team/node-base:v1',
  );
  await dialog.getByLabel('Name', { exact: true }).fill('template-created');
  await dialog
    .getByRole('button', { name: 'Create sandbox', exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect(
    await (await request.get('/__fixture/commands')).json(),
  ).toContainEqual([
    'create',
    '--name',
    'template-created',
    '--template',
    'team/node-base:v1',
    '--pull',
    'never',
    'shell',
  ]);
});

test('saves a template and deletes it through confirmation', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Templates', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save template', exact: true })
    .click();
  const save = page.getByRole('dialog', { name: 'Save template' });
  await save
    .getByRole('combobox', { name: /Source sandbox/ })
    .selectOption('shell-tools');
  await save.getByLabel('Template reference').fill('fixture/tools:v2');
  await save
    .getByRole('button', { name: 'Save template', exact: true })
    .click();
  await expect(page.getByText('fixture/tools', { exact: true })).toBeVisible();
  await page
    .getByRole('button', { name: 'Delete template fixture/tools:v2' })
    .click();
  await page
    .getByRole('dialog', { name: 'Delete fixture/tools:v2?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByText('fixture/tools', { exact: true }),
  ).not.toBeVisible();
  const commands = await (await request.get('/__fixture/commands')).json();
  expect(commands).toContainEqual([
    'template',
    'save',
    'shell-tools',
    'fixture/tools:v2',
  ]);
  expect(commands).toContainEqual([
    'template',
    'rm',
    '--force',
    'fixture/tools:v2',
  ]);
});

test('secrets screenshot and scoped service secret stays redacted', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Secrets', exact: true }).click();
  await expect(
    page.getByRole('cell', { name: 'openai', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('secrets.png');
  await page.getByRole('button', { name: 'Add secret' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add or update secret' });
  await dialog
    .getByRole('combobox', { name: /^Scope/ })
    .selectOption('atlas-api');
  await dialog
    .getByRole('combobox', { name: /^Service/ })
    .selectOption('github');
  await dialog
    .locator('input[name="value"]')
    .fill('fixture-private-service-value');
  await dialog.getByRole('button', { name: 'Save secret' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('cell', { name: 'github', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('fixture-private-service-value'),
  ).not.toBeVisible();
  const commands = await (await request.get('/__fixture/commands')).json();
  expect(commands).toContainEqual([
    'secret',
    'set',
    'github',
    '--sandbox',
    'atlas-api',
  ]);
  expect(JSON.stringify(commands)).not.toContain(
    'fixture-private-service-value',
  );
  await page.getByRole('button', { name: 'Delete secret github' }).click();
  await page
    .getByRole('dialog', { name: 'Remove stored secret?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByRole('cell', { name: 'github', exact: true }),
  ).not.toBeVisible();
});

test('stores and removes host registry credentials without exposing the password', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Secrets', exact: true }).click();
  await page.getByRole('button', { name: 'Add secret' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add or update secret' });
  await dialog
    .getByRole('combobox', { name: /^Type/ })
    .selectOption('registry');
  await dialog.getByLabel('Registry hostname').fill('registry.fixture.test');
  await dialog.getByLabel('Username (optional)').fill('fixture-user');
  await dialog.getByLabel('Password or token').fill('fixture-private-password');
  await dialog.getByRole('button', { name: 'Save secret' }).click();
  await expect(
    page.getByRole('cell', { name: 'registry.fixture.test', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('fixture-private-password')).not.toBeVisible();
  expect(
    await (await request.get('/__fixture/commands')).json(),
  ).toContainEqual([
    'secret',
    'set',
    '--registry',
    'registry.fixture.test',
    '--password-stdin',
    '--username',
    'fixture-user',
  ]);
  await page
    .getByRole('button', { name: 'Delete secret registry.fixture.test' })
    .click();
  await page
    .getByRole('dialog', { name: 'Remove stored secret?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByRole('cell', { name: 'registry.fixture.test', exact: true }),
  ).not.toBeVisible();
});

test('adds a scoped custom reference and removes its placeholder', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Secrets', exact: true }).click();
  await page.getByRole('button', { name: 'Add secret' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add or update secret' });
  await dialog.getByRole('combobox', { name: /^Type/ }).selectOption('custom');
  await dialog
    .getByRole('combobox', { name: /^Secret source/ })
    .selectOption('reference');
  await dialog
    .getByRole('combobox', { name: /^Scope/ })
    .selectOption('docs-lab');
  await dialog.getByLabel('Target hosts').fill('api.fixture.test');
  await dialog.getByLabel('Environment variable').fill('FIXTURE_API_KEY');
  await dialog.getByLabel('Secret reference').fill('op://Fixtures/API/key');
  await dialog.getByRole('button', { name: 'Save secret' }).click();
  await expect(
    page.getByText('FIXTURE_API_KEY', { exact: false }),
  ).toBeVisible();
  expect(
    await (await request.get('/__fixture/commands')).json(),
  ).toContainEqual([
    'secret',
    'set-custom',
    '--host',
    'api.fixture.test',
    '--env',
    'FIXTURE_API_KEY',
    '--ref',
    'op://Fixtures/API/key',
    '--sandbox',
    'docs-lab',
  ]);
  await page
    .getByRole('button', { name: 'Delete custom secret FIXTURE_API_KEY' })
    .click();
  await page
    .getByRole('dialog', { name: 'Remove stored secret?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByText('FIXTURE_API_KEY', { exact: false }),
  ).not.toBeVisible();
});

test('stores and removes a direct custom secret without exposing its value', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'Secrets', exact: true }).click();
  await page.getByRole('button', { name: 'Add secret' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add or update secret' });
  await dialog.getByRole('combobox', { name: /^Type/ }).selectOption('custom');
  await dialog
    .getByRole('combobox', { name: /^Scope/ })
    .selectOption('atlas-api');
  await dialog.getByLabel('Target hosts').fill('api.direct.fixture.test');
  await dialog.getByLabel('Environment variable').fill('FIXTURE_DIRECT_KEY');
  await dialog
    .locator('input[name="value"]')
    .fill('fixture-private-custom-value');
  await dialog.getByRole('button', { name: 'Save secret' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText('FIXTURE_DIRECT_KEY', { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByText('fixture-private-custom-value'),
  ).not.toBeVisible();
  const commands = await (await request.get('/__fixture/commands')).json();
  expect(commands).toContainEqual([
    'secret',
    'set-custom',
    '--host',
    'api.direct.fixture.test',
    '--env',
    'FIXTURE_DIRECT_KEY',
    '--sandbox',
    'atlas-api',
  ]);
  expect(JSON.stringify(commands)).not.toContain(
    'fixture-private-custom-value',
  );
  await page
    .getByRole('button', { name: 'Delete custom secret FIXTURE_DIRECT_KEY' })
    .click();
  await page
    .getByRole('dialog', { name: 'Remove stored secret?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByText('FIXTURE_DIRECT_KEY', { exact: false }),
  ).not.toBeVisible();
});

test('ports screenshot and publishing then unpublishing a binding', async ({
  page,
  request,
}) => {
  await page.getByRole('button', { name: 'atlas-api', exact: true }).click();
  await expect(page.getByText('127.0.0.1:3000', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('published-ports.png');
  await page.getByRole('button', { name: 'Publish port', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Publish port' });
  await dialog.getByLabel('Sandbox port').fill('8080');
  await dialog.getByLabel('Host port (optional)').fill('18080');
  await dialog.getByLabel('Host IP (optional)').fill('127.0.0.1');
  await dialog
    .getByRole('button', { name: 'Publish port', exact: true })
    .click();
  await expect(
    page.getByText('127.0.0.1:18080', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Unpublish port 18080' }).click();
  await page
    .getByRole('dialog', { name: 'Unpublish port 18080?' })
    .getByRole('button', { name: 'Confirm deletion' })
    .click();
  await expect(
    page.getByText('127.0.0.1:18080', { exact: true }),
  ).not.toBeVisible();
  const commands = await (await request.get('/__fixture/commands')).json();
  expect(commands).toContainEqual([
    'ports',
    'atlas-api',
    '--publish',
    '127.0.0.1:18080:8080/tcp4',
  ]);
  expect(commands).toContainEqual([
    'ports',
    'atlas-api',
    '--unpublish',
    '127.0.0.1:18080:8080/tcp4',
  ]);
});
