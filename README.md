# ZeroFoodWaste

ZeroFoodWaste is an Expo SDK 57 app for iOS and Android. Its planned purpose is to help households use food before it expires and reduce domestic food waste. The current screen is a **scaffold**: its three food items are examples only, and showing or hiding them changes memory state for this app session. There is no inventory, expiration logic, or persistence yet.

## Get started

Use Node.js 22.13 or newer and pnpm 11.6.0. Keep `pnpm-lock.yaml` as the only lockfile.

```bash
pnpm install --frozen-lockfile
pnpm start
```

Open an iOS simulator or Android emulator from Expo CLI, or run `pnpm ios` / `pnpm android`. Expo Go can run this scaffold; a development build may be needed when future native features are added. The app supports English and Spanish based on the device or per-app language preference, with English fallback.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router routes and native stack layout. Route files compose screens. |
| `src/features/pantry/` | Pantry feature UI and the display-only sample list. Future inventory domain rules and flows belong here. |
| `src/components/ui/` | Reusable button, text, and surface primitives. |
| `src/theme/` | Light and dark semantic color and spacing tokens. |
| `src/i18n/` | Typed English and Spanish messages and device-locale selection. |
| `assets/images/` | iOS and Android launcher images. |
| `.github/workflows/` | CI checks for types, lint, tests, and both production bundles. |

Add storage behind a typed pantry repository once the team decides whether data is device-local, account-synced, or shared. Keep external product lookup and recipe providers in typed adapters beside their feature modules; recipes and statistics get their own feature folders when implemented. Do not infer an expiration date from a barcode. The planned roadmap and open domain decisions are in the local project guide.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm export:ios
pnpm export:android
```

Production exports check JavaScript bundles; they are not native binary builds. Before review, also open the screen on both mobile targets and check light/dark appearance, accessibility labels, safe areas, and the show/hide interaction. An iOS simulator requires Xcode on macOS; an Android emulator requires the Android SDK.

## Git Workflow

To keep the repository organized and make collaboration easier, we follow a simple Git workflow.

### 1. Keep `main` Stable

The `main` branch should always contain a working version of the application.

- Do not develop directly on `main`.
- All changes should be made in separate branches.
- Changes are merged into `main` through Pull Requests.

---

### 2. Branch Naming

Each branch should focus on **one feature, fix, or task**.

Use the following prefixes:

| Prefix | Purpose | Example |
|---|---|---|
| `feat/` | New feature | `feat/food-inventory` |
| `fix/` | Bug fix | `fix/expiration-date` |
| `refactor/` | Code restructuring | `refactor/inventory-service` |
| `docs/` | Documentation | `docs/update-readme` |
| `test/` | Tests | `test/inventory-service` |
| `chore/` | Configuration, dependencies, tooling | `chore/update-expo` |

Use lowercase names and separate words with `-`.

Examples:

```text
feat/add-product
feat/recipe-search
feat/barcode-scanner
fix/recipe-loading
docs/update-readme
```

Avoid large branches such as `feat/sprint-2`. Prefer smaller branches for individual tasks.

---

### 3. Creating a Branch

Create a new branch for each feature, fix, or task:

```bash
git switch -c feat/add-product
```

Work only on that branch and push your changes to GitHub:

```bash
git add .
git commit -m "[add] create product form"
git push -u origin feat/add-product
```

---

### 4. Commit Messages

Commits should be small and have clear, descriptive messages.

Use the following prefixes:

| Prefix | Purpose |
|---|---|
| `[add]` | Add new functionality |
| `[fix]` | Fix a bug |
| `[refactor]` | Restructure code without changing functionality |
| `[test]` | Add or modify tests |
| `[docs]` | Documentation changes |
| `[chore]` | Dependencies, configuration, or tooling |

Examples:

```text
[add] create product form
[add] display expiration date in inventory
[fix] correct expiration date calculation
[fix] prevent empty product names
[refactor] move recipe logic to service
[test] add inventory service tests
[docs] update project setup instructions
[chore] update Expo dependencies
```

Avoid unclear commit messages such as:

```text
update
changes
fix
stuff
final changes
```

---

### 5. Pull Requests

All changes to `main` must go through a **Pull Request (PR) on GitHub**.

- Never push changes directly to `main`.
- Open a Pull Request from your branch into `main`.
- Each PR should focus on one feature, fix, or task.
- At least **one other team member** should review and approve the PR.
- Resolve any conflicts before merging.
- Make sure the application works correctly before merging.

Example:

```text
feat/add-product
       │
       ▼
GitHub Pull Request
       │
       ▼
Review + Approval
       │
       ▼
Squash and Merge
       │
       ▼
     main
```

---

### 6. Merging

Use **Squash and Merge** on GitHub.

This combines all commits from the branch into a single clean commit on `main`.

For example, the branch may contain:

```text
[add] create product form
[fix] fix form validation
[fix] correct expiration input
```

After Squash and Merge:

```text
[add] implement product creation
```

After the Pull Request is merged, delete the branch.

---

### Typical Workflow

```text
1. Create a branch
        ↓
2. Work on the task
        ↓
3. Commit changes
        ↓
4. Push the branch to GitHub
        ↓
5. Open a Pull Request into main
        ↓
6. Another team member reviews it
        ↓
7. Squash and Merge on GitHub
        ↓
8. Delete the branch
```

Example:

```bash
# Create a branch
git switch -c feat/add-product

# Work and commit
git add .
git commit -m "[add] create product form"

# Push the branch
git push -u origin feat/add-product

# Then on GitHub:
# 1. Open a Pull Request into main
# 2. Get at least one teammate approval
# 3. Squash and Merge
# 4. Delete the branch
```

---
