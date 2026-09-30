import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request, page }) => {
  await request.post('/__fixture/reset');
  await page.goto('/');
  await page.getByRole('button', { name: 'atlas-api', exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
});

test('explores folders and displays a scrollable text file', async ({
  page,
  request,
}) => {
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Directory entries' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('sandbox-files.png');
  await expect(
    page.getByRole('listitem').filter({ hasText: 'current' }),
  ).toBeDisabled();
  await page.getByRole('listitem').filter({ hasText: 'src' }).click();
  await expect(page.getByLabel('Sandbox path')).toHaveValue('/src');
  await page.getByRole('button', { name: 'Parent folder' }).click();
  await expect(page.getByLabel('Sandbox path')).toHaveValue('/');
  await page.getByRole('listitem').filter({ hasText: 'README.md' }).click();
  await expect(page.getByLabel('File contents')).toContainText(
    'A fixture workspace for deterministic browser tests.',
  );
  const viewer = page.getByLabel('File contents');
  expect(
    await viewer.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await expect(page.locator('.file-viewer')).toHaveScreenshot(
    'sandbox-text-viewer.png',
  );
  const commands: string[][] = await (
    await request.get('/__fixture/commands')
  ).json();
  const executions = commands.filter((command) => command[0] === 'exec');
  expect(executions).toHaveLength(4);
  expect(executions.at(-1)?.slice(0, 4)).toEqual([
    'exec',
    'atlas-api',
    'bash',
    '-c',
  ]);
  expect(executions.at(-1)?.at(-1)).toBe('/README.md');
});

test('maps disk usage with filesystem totals and largest directories', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Disk usage', exact: true }).click();
  await page.getByRole('button', { name: 'Check disk usage' }).click();
  await expect(
    page.getByText('500.0 MB / 1.0 GB', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('/node_modules', { exact: true })).toBeVisible();
  await expect(page.getByText('256.0 MB', { exact: true })).toBeVisible();
  await expect(page).toHaveScreenshot('sandbox-disk.png');
});

test('rejects oversized and binary files with visible errors', async ({
  page,
}) => {
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await page.getByRole('listitem').filter({ hasText: 'binary.bin' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Binary files cannot be displayed',
  );
  await expect(page.getByLabel('File contents')).not.toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'large.txt' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'File exceeds the 1 MiB viewer limit',
  );
  await expect(page.getByLabel('File contents')).not.toBeVisible();
});

test('passes quoted paths and shell punctuation as a single positional argument', async ({
  page,
  request,
}) => {
  await page.getByRole('tab', { name: 'Files', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Directory entries' }),
  ).toBeVisible();
  const path = '/workspace/odd "name\';$(printf injected)';
  await page.getByLabel('Sandbox path').fill(path);
  await page.getByRole('button', { name: 'Browse', exact: true }).click();
  await expect(page.locator('.file-browser code')).toHaveText(path);
  const commands: string[][] = await (
    await request.get('/__fixture/commands')
  ).json();
  const execution = commands.filter((command) => command[0] === 'exec').at(-1);
  expect(execution?.slice(-2)).toEqual(['--', path]);
  expect(execution?.[4]).not.toContain(path);
});

test('opens persistent Bash, runs a command and closes the session', async ({
  page,
  request,
}) => {
  await page.getByRole('tab', { name: 'Terminal', exact: true }).click();
  await page
    .getByRole('button', { name: 'Open terminal', exact: true })
    .click();
  await expect(page.getByLabel('Terminal output')).toContainText(
    'Fixture Bash in atlas-api',
  );
  await page.getByLabel('Bash command').fill('whoami');
  await page.getByRole('button', { name: 'Run command' }).click();
  await expect(page.getByLabel('Terminal output')).toContainText(
    'fixture-user',
  );
  expect(
    await (await request.get('/__fixture/terminal-commands')).json(),
  ).toEqual(['whoami\n']);
  await expect(page).toHaveScreenshot('sandbox-terminal.png');
  await page
    .getByRole('button', { name: 'Close terminal', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Open terminal', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Terminal output')).not.toBeVisible();
});
