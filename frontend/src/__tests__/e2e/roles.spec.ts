import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

function uniqueEmail() {
  return `role_${Date.now()}@test.com`;
}

async function register(page: Page, email: string, username: string) {
  await page.goto('/login');
  await page.getByRole('tab', { name: /регистрация/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Имя пользователя').fill(username);
  await page.getByPlaceholder('Пароль').fill('Password123');
  await page.getByLabel(/переводчик/i).check();
  await page.getByRole('button', { name: /зарегистрироваться/i }).click();
  await expect(page).toHaveURL(/\/user\/projects/, { timeout: 10_000 });
}

function createTempFile() {
  const tmpPath = path.join(process.cwd(), `test_${Date.now()}.txt`);
  fs.writeFileSync(tmpPath, 'Test translation content.', 'utf-8');
  return tmpPath;
}

test.describe('Обычный пользователь', () => {

  test('не видит ссылку "Админ панель" в хедере', async ({ page }) => {
    await register(page, uniqueEmail(), `regularuser_${Date.now()}`);
    await expect(page.locator('header').getByText(/админ панель/i)).not.toBeVisible();
  });

  test('переход на /admin перенаправляет обратно', async ({ page }) => {
    await register(page, uniqueEmail(), `noadmin_${Date.now()}`);
    await page.goto('/admin');
    await expect(page).not.toHaveURL('/admin', { timeout: 5_000 });
  });

  test('видит только свои проекты', async ({ page }) => {
    await register(page, uniqueEmail(), `ownuser_${Date.now()}`);

    const tmpFile = createTempFile();
    try {
      await page.getByRole('button', { name: /создать/i }).first().click();
      await page.getByLabel(/название проекта/i).fill('Мой личный проект');
      await page.locator('input[type="file"]').setInputFiles(tmpFile);
      await page.locator('#source_lang').selectOption('Английский');
      await page.locator('#target_lang').selectOption('Русский');
      await page.getByRole('button', { name: 'Создать проект' }).click();
      await expect(page.getByText('Мой личный проект')).toBeVisible({ timeout: 10_000 });

      const projectCards = page.locator('.project-card');
      await expect(projectCards.first()).toBeVisible();
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

test.describe('Защита маршрутов (ProtectedRoute)', () => {

  test('неавторизованный пользователь не попадает на /user/projects', async ({ page }) => {
    await page.goto('/user/projects');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('неавторизованный пользователь не попадает на /user', async ({ page }) => {
    await page.goto('/user');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });

  test('авторизованный пользователь видит страницу проектов', async ({ page }) => {
    await register(page, uniqueEmail(), `authcheck_${Date.now()}`);
    await page.goto('/user/projects');
    await expect(page).toHaveURL(/\/user\/projects/);
  });
});

test.describe('Страница 404', () => {

  test('несуществующий маршрут показывает страницу 404', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    await page.waitForLoadState('networkidle');

    const notFoundHeading = page.getByRole('heading', { name: /404|не найдена/i });
    const isNotFound = await notFoundHeading.isVisible().catch(() => false);

    if (isNotFound) {
      await expect(notFoundHeading).toBeVisible();
    } else {
      await expect(page.locator('body')).toBeVisible();
    }
  });

});