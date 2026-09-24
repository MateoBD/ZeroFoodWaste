# ZeroFoodWaste

ZeroFoodWaste is an Expo SDK 57 app for iOS, Android, and local web testing. Its planned purpose is to help households use food before it expires and reduce domestic food waste. The current screen is a **session-only scaffold**: users can add food names, but those entries exist only in memory and disappear when the screen or app restarts. There is no quantity, expiration logic, sorting, editing, deletion, or persistence yet.

## Get started

Use Node.js 22.13 or newer and pnpm 11.6.0. Keep `pnpm-lock.yaml` as the only lockfile.

```bash
pnpm install --frozen-lockfile
pnpm start
```

Open an iOS simulator or Android emulator from Expo CLI, or run `pnpm ios` / `pnpm android`. To test locally in a browser, run `pnpm web`; Expo serves the app at the local URL printed by the CLI. Expo Go can run this scaffold; a development build may be needed when future native features are added. The app supports English and Spanish based on the device, browser, or per-app language preference, with English fallback.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router routes and native stack layout. Route files compose screens. |
| `src/features/pantry/` | Session-only pantry screen, form, empty state, and item rows. Future inventory domain rules and flows belong here. |
| `src/components/ui/` | Reusable button, text, and surface primitives. |
| `src/theme/` | Light and dark semantic color and spacing tokens. |
| `src/i18n/` | Typed English and Spanish messages and device-locale selection. |
| `assets/images/` | iOS and Android launcher images. |
| `.github/workflows/pr-checks.yml` | Pull request and post-merge CI for types, lint, tests, and both production bundles. |

Add storage behind a typed pantry repository once the team decides whether data is device-local, account-synced, or shared. Keep external product lookup and recipe providers in typed adapters beside their feature modules; recipes and statistics get their own feature folders when implemented. Do not infer an expiration date from a barcode. The planned roadmap and open domain decisions are in the local project guide.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm export:ios
pnpm export:android
pnpm export:web
```

Production exports check JavaScript bundles and the static web output; they are not native binary builds. Before review, also open the screen on both mobile targets and in a local browser and check light/dark appearance, accessibility labels and error announcements, safe-area scrolling, keyboard submission, touch targets, and the add/cancel flow. An iOS simulator requires Xcode on macOS; an Android emulator requires the Android SDK.

The single workflow at `.github/workflows/pr-checks.yml` runs on Pull Requests
targeting `dev` or `main`, and on pushes to those protected branches after a
merge. It uses Node.js 22, pnpm 11.6.0, and `pnpm install --frozen-lockfile`,
then runs lint, type checking, tests, and both platform bundle exports.

The required status checks are `branch-policy` and `ci`. The workflow enforces
these Pull Request source rules:

- PRs into `dev` must come from a branch matching
  `^(feat|fix|refactor|test|docs|chore)/[a-z0-9][a-z0-9-]*$`.
- PRs into `main` must come from `dev` exactly.
- A task branch cannot skip `dev` by opening a PR directly into `main`.

CI/CD currently covers verification only. EAS builds, App Store or Play Store
publishing, and related secrets are intentionally deferred until credentials
and distribution decisions are defined.

## Git Workflow

To keep the repository organized and make collaboration easier, we follow a simple Git workflow.

### 1. Keep `main` and `dev` Protected

`main` is the production branch. `dev` is the integration branch where the
team tests the product before production release.

- Do not push directly to `main` or `dev`.
- Do not merge local branches directly into `main` or `dev`.
- “Merge into `dev`” means merging an approved GitHub Pull Request; it does
  not mean a local merge or direct push.
- Every change enters through a reviewed Pull Request.
- Task branches target `dev`; a release Pull Request promotes verified `dev`
  into `main`.

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

### 5. Pull Requests and promotion

All changes to `dev` and `main` must go through a **Pull Request (PR) on
GitHub**.

- Never push or merge directly into `main` or `dev`.
- Open task Pull Requests from your branch into `dev`.
- Each PR should focus on one feature, fix, or task.
- At least **one other team member** should review and approve the PR.
- Run the required checks and test the product on supported mobile targets.
- After `dev` is verified for release, open a release Pull Request from `dev`
  into `main`.
- Resolve any conflicts before merging.
- Make sure the application works correctly before merging.

GitHub branch protection or Rulesets must be configured for both `dev` and
`main` with these settings:

- Require a Pull Request, at least one approval, and conversation resolution.
- Dismiss stale approvals when new commits arrive.
- Require the `branch-policy` and `ci` status checks and require the branch to
  be up to date before merging.
- Restrict branch deletion and block force pushes.
- Do not grant bypass access to normal team members.

The `branch-policy` check enforces the source-branch restrictions above. The
exact availability of these Ruleset options depends on the repository's GitHub
plan; configure them manually in the repository settings.

Example:

```text
feat/add-product
       │
       ▼
GitHub Pull Request → dev
       │
       ▼
Review + Approval
       │
       ▼
Integration testing on dev
       │
       ▼
Release Pull Request: dev → main
       │
       ▼
     main
```

---

### 6. Merging

Use **Squash and Merge** on GitHub.

Use **Squash and Merge** for task Pull Requests into `dev` and for the release
Pull Request into `main`. Direct pushes and local merges into either protected
branch are prohibited.

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

After the Pull Request is merged, delete the task branch. Keep `dev` and `main`.

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
5. Open a Pull Request into dev
        ↓
6. Another team member reviews it
        ↓
7. Test the integrated product on dev
        ↓
8. Open a release Pull Request from dev into main
        ↓
9. Squash and Merge on GitHub
        ↓
10. Delete the task branch
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
# 1. Open a Pull Request into dev
# 2. Get at least one teammate approval
# 3. Test the integrated product on dev
# 4. Open a release Pull Request from dev into main
# 5. Get approval and squash-merge the release PR
# 6. Delete the task branch
```

---
