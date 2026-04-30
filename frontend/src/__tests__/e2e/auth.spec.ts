import { test, expect, Page } from '@playwright/test';

async function register(page: Page, email: string, username: string, password = 'Password123') {
  await page.goto('/login');
  await page.getByRole('tab', { name: /регистрация/i }).click();
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Имя пользователя').fill(username);
  await page.getByPlaceholder('Пароль').fill(password);
  await page.getByLabel(/переводчик/i).check();
  await page.getByRole('button', { name: /зарегистрироваться/i }).click();
  await expect(page).toHaveURL(/\/user\/projects/, { timeout: 10_000 });
}

function uniqueEmail() {
  return `test_${Date.now()}@example.com`;
}

test.describe('Регистрация', () => {

  test('успешная регистрация — редирект на /user/projects', async ({ page }) => {
    const email = uniqueEmail();
    const username = `user_${Date.now()}`;
    await register(page, email, username);
    await expect(page).toHaveURL(/\/user\/projects/);
    await expect(page.locator('.user-name')).toContainText(username);
  });

  test('ошибка при коротком пароле — без запроса к серверу', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: /регистрация/i }).click();
    await page.getByPlaceholder('Email').fill('valid@test.com');
    await page.getByPlaceholder('Имя пользователя').fill('validuser');
    await page.getByPlaceholder('Пароль').fill('123');
    await page.getByLabel(/переводчик/i).check();
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();
    await expect(page.getByText(/не менее 6 символов/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('ошибка если роль не выбрана', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('tab', { name: /регистрация/i }).click();
    await page.getByPlaceholder('Email').fill('role@test.com');
    await page.getByPlaceholder('Имя пользователя').fill('roleuser');
    await page.getByPlaceholder('Пароль').fill('Password123');
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();
    await expect(page.getByText(/выберите хотя бы одну роль/i)).toBeVisible();
  });

  test('ошибка при дублирующем email', async ({ page }) => {
    const email = uniqueEmail();
    const username = `dupuser_${Date.now()}`;
    await register(page, email, username);

    await page.locator('.user-menu-btn').click();
    await page.locator('.user-dropdown').getByRole('button', { name: /выйти/i }).click();

    await page.goto('/login');
    await page.getByRole('tab', { name: /регистрация/i }).click();
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Имя пользователя').fill(`other_${Date.now()}`);
    await page.getByPlaceholder('Пароль').fill('Password123');
    await page.getByLabel(/переводчик/i).check();
    await page.getByRole('button', { name: /зарегистрироваться/i }).click();
    await expect(page.getByRole('alert')).toContainText(/уже существует/i);
  });
});

test.describe('Вход', () => {

  test('успешный вход — редирект на /user/projects', async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email, `loginuser_${Date.now()}`);

    await page.locator('.user-menu-btn').click();
    await page.locator('.user-dropdown').getByRole('button', { name: /выйти/i }).click();

    await page.goto('/login');
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Пароль').fill('Password123');
    await page.getByRole('button', { name: /^войти$/i }).click();
    await expect(page).toHaveURL(/\/user\/projects/, { timeout: 10_000 });
  });

  test('неверный пароль — ошибка 401', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('nobody@test.com');
    await page.getByPlaceholder('Пароль').fill('wrongpassword');
    await page.getByRole('button', { name: /^войти$/i }).click();
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Выход', () => {

  test('выход очищает сессию и перенаправляет на главную', async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email, `logoutuser_${Date.now()}`);

    await page.locator('.user-menu-btn').click();
    await page.locator('.user-dropdown').getByRole('button', { name: /выйти/i }).click();

    await expect(page).toHaveURL('/', { timeout: 5_000 });

    await expect(
      page.locator('header').getByRole('link', { name: /войти/i })
    ).toBeVisible();
  });
});

test.describe('Сессия', () => {

  test('перезагрузка страницы сохраняет авторизацию', async ({ page }) => {
    const email = uniqueEmail();
    await register(page, email, `sessuser_${Date.now()}`);
    await page.reload();
    await expect(page.locator('.user-menu-btn')).toBeVisible({ timeout: 8_000 });
  });

  test('защищённый маршрут без сессии — редирект на /login', async ({ page }) => {
    await page.goto('/user/projects');
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});