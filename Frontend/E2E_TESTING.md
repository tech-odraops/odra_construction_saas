# Frontend E2E Testing

End-to-end tests use Playwright Test with Chromium. The configuration is in
`playwright.config.js`, and test files live in `e2e/`.

## Setup

From the `Frontend` directory, install dependencies and the Chromium browser:

```powershell
npm install
npx playwright install chromium
```

Playwright starts the Vite development server automatically at
`http://127.0.0.1:5173`. Do not start a separate server unless you change the
Playwright web-server configuration.

## Run Tests

Run the complete suite headlessly:

```powershell
npm run test:e2e
```

Run the complete suite with a visible browser window:

```powershell
npm run test:e2e:headed
```

Run one spec file:

```powershell
npm run test:e2e -- e2e/login.spec.js
```

Run tests whose title matches a phrase:

```powershell
npm run test:e2e -- --grep "regular login"
```

Run a single test visibly:

```powershell
npm run test:e2e:headed -- --grep "logs in a manager"
```

Run the opt-in tests against real manager, site-engineer, and admin accounts:

```powershell
$env:E2E_LIVE_AUTH = 'true'
npm run test:e2e:live
```

Set these variables in the same local shell before running the command:

- `E2E_MANAGER_EMAIL` and `E2E_MANAGER_PASSWORD`
- `E2E_ENGINEER_EMAIL` and `E2E_ENGINEER_PASSWORD`
- `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`
- `VITE_API_URL` must point to the backend environment used for testing.

Live tests are skipped unless `E2E_LIVE_AUTH=true` and the corresponding
account variables are present. Keep credentials in local environment settings
or a secret manager; do not put real credentials in specs, documentation, or
committed `.env` files. The tests perform real sign-ins and may trigger backend
login activity.

Playwright is configured with one worker, so tests run one at a time. The
headed command uses the same configuration and worker limit.

## Writing Specs

- Name files `*.spec.js` so Playwright discovers them under `e2e/`.
- Import `test` and `expect` from `@playwright/test`.
- Group related cases with `test.describe`; use `test.beforeEach` for shared
  navigation or setup.
- Prefer accessible locators such as `getByRole` and stable form labels or
  attributes. Avoid brittle CSS selectors tied to styling.
- Assert behavior a user can observe: validation messages, error feedback,
  navigation, and successful page content.
- Mock API responses with `page.route()` when testing a frontend flow. Keep
  tests independent of real accounts, backend availability, and external
  services.
- Use realistic response shapes. For login success, stub every follow-up
  request the screen needs, such as `/subscription/me`.
- Keep each test focused on one behavior and give it a descriptive title.

Example API mock:

```js
await page.route('**/auth/signIn', async (route) => {
  await route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Invalid credentials' }),
  });
});
```

Then submit the form and assert that the error is visible. For login happy
paths, also assert the expected URL and relevant session state rather than
only checking that the request completed.

## Current Specs

- `e2e/home.spec.js`: verifies the homepage mounts.
- `e2e/login.spec.js`: covers regular login form rendering, validation,
  rejected credentials, and a successful manager login.
- `e2e/admin-login.spec.js`: covers admin login form rendering and rejected
  credentials.