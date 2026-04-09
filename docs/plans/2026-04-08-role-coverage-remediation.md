# Role And Coverage Remediation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Separate the admin experience from the customer shell, enforce clear staff/admin capabilities in the frontend, and close the highest-impact frontend coverage gaps discovered in the project audit.

**Architecture:** Introduce a small, tested permission model in the frontend that becomes the single source of truth for route guards, admin navigation, and action visibility. Use that model to split routing/layout responsibilities between customer-facing pages and the back-office shell, then add targeted UX and coverage fixes without changing backend authorization rules.

**Tech Stack:** React 19, React Router 7, TanStack Query, TypeScript, Vitest, Express/Prisma backend contract

---

### Task 1: Lock Down Role Capability Rules

**Files:**
- Create: `src/features/auth/role-access.ts`
- Create: `src/features/auth/role-access.test.ts`
- Modify: `src/features/auth/AuthContext.tsx`
- Modify: `src/lib/types.ts`

**Step 1: Write the failing test**

Add Vitest coverage for:
- `customer` cannot access back-office routes
- `staff` can access operations screens but not admin-only screens
- `admin` can access every back-office screen
- admin navigation items are filtered by role

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/auth/role-access.test.ts`
Expected: FAIL because `role-access.ts` does not exist yet.

**Step 3: Write minimal implementation**

Create a pure helper module that exports:
- role constants for `customer`, `staff`, `admin`
- admin section ids such as `dashboard`, `orders`, `inventory`, `books`, `customers`, `vouchers`, `reports`, `contacts`, `logs`, `settings`
- capability helpers like `canAccessAdminSection(role, section)` and `getAdminSectionsForRole(role)`

Update auth context types so UI code can consume the same capability logic without duplicating `role === 'admin'` checks.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/features/auth/role-access.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/features/auth/role-access.ts src/features/auth/role-access.test.ts src/features/auth/AuthContext.tsx src/lib/types.ts
git commit -m "test: define frontend role capability model"
```

### Task 2: Split Customer Shell And Admin Shell

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `src/components/AdminLayout.tsx`
- Create: `src/components/AdminTopbar.tsx` if needed

**Step 1: Write the failing test**

Add a focused test around the new route/capability mapper if route objects are generated from helper config. If route testing is too heavy, keep TDD at the config level by testing which sections are exposed for each role.

**Step 2: Run test to verify it fails**

Run the targeted Vitest command for the added config helper test.

**Step 3: Write minimal implementation**

Restructure routing so:
- customer/public pages continue under `AppShell`
- `/admin` uses a dedicated admin shell, not nested under the customer shell
- staff only sees allowed pages
- admin sees the full dashboard and admin-only sections

Update the main header so customer navigation no longer mixes in back-office concerns.

**Step 4: Run test to verify it passes**

Run the targeted role-access tests, then `npm run typecheck`.

**Step 5: Commit**

```bash
git add src/app/router.tsx src/app/App.tsx src/components/AppShell.tsx src/components/AdminLayout.tsx src/components/AdminTopbar.tsx
git commit -m "feat: separate back-office shell from customer shell"
```

### Task 3: Prevent Staff From Seeing Admin-Only Actions

**Files:**
- Modify: `src/features/admin/admin-api.ts`
- Modify: `src/features/admin/AdminPage.tsx`
- Modify: `src/features/admin/AdminBooksPage.tsx`
- Modify: `src/features/admin/AdminCustomersPage.tsx`
- Modify: `src/features/admin/AdminVouchersPage.tsx`
- Modify: `src/features/admin/AdminSettingsPage.tsx`
- Modify: `src/features/admin/AdminReportsPage.tsx`
- Modify: `src/features/admin/AdminLogsPage.tsx`

**Step 1: Write the failing test**

Add tests for admin section visibility:
- `staff` does not receive `customers`, `settings`, `logs`, or admin analytics sections
- `admin` still receives them

**Step 2: Run test to verify it fails**

Run: `npm test -- src/features/auth/role-access.test.ts`

**Step 3: Write minimal implementation**

Use the shared permission model to:
- stop calling admin-only APIs for staff
- hide destructive CRUD affordances from staff
- keep staff on operational pages such as orders, contacts, inventory
- make reports/logs/settings pages either admin-only or render a safe, explicit restricted state

**Step 4: Run test to verify it passes**

Run targeted tests, then `npm run build`.

**Step 5: Commit**

```bash
git add src/features/admin/admin-api.ts src/features/admin/*.tsx
git commit -m "fix: align staff back-office access with backend authorization"
```

### Task 4: Close Highest-Impact Customer Coverage Gaps

**Files:**
- Modify: `src/components/BookCard.tsx`
- Modify: `src/features/home/HomePage.tsx`
- Modify: `src/features/catalog/CatalogPage.tsx`
- Modify: `src/features/account/account-api.ts`
- Modify: `src/features/account/AccountPage.tsx`

**Step 1: Write the failing test**

Add tests for any extracted helpers used to power new CTA or account affordances, such as checkout CTA state or account action availability.

**Step 2: Run test to verify it fails**

Run the new targeted Vitest test file.

**Step 3: Write minimal implementation**

Ship the smallest useful fixes:
- add clearer purchase/cart CTA from list surfaces
- expose checkout path more clearly for customers
- add account-level editing coverage for the most important self-service gaps if feasible in this batch, otherwise add explicit placeholders with routing hooks and TODO boundaries

**Step 4: Run test to verify it passes**

Run targeted tests, `npm run typecheck`, and `npm run build`.

**Step 5: Commit**

```bash
git add src/components/BookCard.tsx src/features/home/HomePage.tsx src/features/catalog/CatalogPage.tsx src/features/account/account-api.ts src/features/account/AccountPage.tsx
git commit -m "feat: improve customer checkout discovery and account coverage"
```

### Task 5: Verify Whole Stack Contract After Changes

**Files:**
- Modify as needed: `README.md`
- Modify as needed: `docs/UI-RESTRUCTURE-PLAN.md`

**Step 1: Run frontend verification**

Run:
- `npm test`
- `npm run typecheck`
- `npm run build`

Expected: PASS

**Step 2: Run backend verification**

Run in `H:\\NODEJSPRJ\\BookStoreManager`:
- `npm test`
- `npm run lint:types`
- `npm run build`

Expected: PASS

**Step 3: Update docs if behavior changed**

Document any finalized role matrix or route split that affects future development.

**Step 4: Commit**

```bash
git add README.md docs/UI-RESTRUCTURE-PLAN.md
git commit -m "docs: record role-based frontend architecture updates"
```
