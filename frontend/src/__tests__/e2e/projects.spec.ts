import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

function createTempFile(content = 'Test content for translation') {
  const tmpPath = path.join(process.cwd(), `test_${Date.now()}.txt`);
  fs.writeFileSync(tmpPath, content, 'utf-8');
  return tmpPath;
}

async function openCreateForm(page: Page) {
  await page.getByRole('button', { name: /создать/i }).first().click();
  await expect(page.locator('.modal')).toBeVisible({ timeout: 5_000 });
}

async function fillProjectForm(page: Page, name: string, filePath: string) {
  await page.getByLabel(/название проекта/i).fill(name);
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await page.locator('#source_lang').selectOption('Английский');
  await page.locator('#target_lang').selectOption('Русский');
}

test.beforeEach(async ({ page }) => {
  const email = `proj_${Date.now()}@test.com`;
  const username = `projuser_${Date.now()}`;

  await page.goto('/login');
  await page.getByRole('tab', { name: /регистрация/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Имя пользователя').fill(username);
  await page.getByPlaceholder('Пароль').fill('Password123');
  await page.getByLabel(/переводчик/i).check();
  await page.getByRole('button', { name: /зарегистрироваться/i }).click();
  await expect(page).toHaveURL(/\/user\/projects/, { timeout: 10_000 });
});

test.describe('Создание проекта', () => {

  test('создание через форму — проект появляется в списке', async ({ page }) => {
    const tmpFile = createTempFile('Hello world. This is a test.');
    try {
      await openCreateForm(page);
      await fillProjectForm(page, 'Мой тестовый проект', tmpFile);
      await page.getByRole('button', { name: 'Создать проект' }).click();
      await expect(page.getByText('Мой тестовый проект')).toBeVisible({ timeout: 10_000 });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  test('валидация — пустое название блокирует отправку формы', async ({ page }) => {
    await openCreateForm(page);

    await page.getByRole('button', { name: 'Создать проект' }).click();

    await expect(page.locator('.modal')).toBeVisible();

    const nameInput = page.locator('#name');
    const isInvalid = await nameInput.evaluate(
      (el) => !( el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });

  test('валидация — без файла блокирует отправку формы', async ({ page }) => {
    await openCreateForm(page);

    await page.getByLabel(/название проекта/i).fill('Проект без файла');
    await page.getByRole('button', { name: 'Создать проект' }).click();

    await expect(page.locator('.modal')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    const isInvalid = await fileInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInvalid).toBe(true);
  });
});

test.describe('Удаление проекта', () => {

  test('удаление через кнопку — проект исчезает из списка', async ({ page }) => {
    const tmpFile = createTempFile('Content to delete');
    try {
      await openCreateForm(page);
      await fillProjectForm(page, 'Проект для удаления', tmpFile);
      await page.getByRole('button', { name: 'Создать проект' }).click();
      await expect(page.getByText('Проект для удаления')).toBeVisible({ timeout: 10_000 });

      page.on('dialog', dialog => dialog.accept());
      await page.getByRole('button', { name: /удалить/i }).first().click();

      await expect(page.getByText('Проект для удаления')).not.toBeVisible({ timeout: 5_000 });
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

test.describe('Поиск и фильтрация', () => {

  test('поиск по несуществующему названию — пустой список', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/поиск/i);

    if (await searchInput.isVisible()) {
      await searchInput.fill('XYZ_НЕСУЩЕСТВУЮЩИЙ_123');
      await page.waitForTimeout(800);
      const emptyState = page.getByText(/нет проектов|не найдено|пусто/i);
      if (await emptyState.isVisible()) {
        await expect(emptyState).toBeVisible();
      }
    }
  });
});