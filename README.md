# ZeroFoodWaste

ZeroFoodWaste is an Expo SDK 57 app for iOS, Android, and local web testing. Its purpose is to help households use food before it expires and reduce domestic food waste. The pantry lets users add and edit food names and expiration dates, keeps them on the device, and offers English TheMealDB ingredient suggestions while the food-name field is active. A Recipes tab searches all eligible pantry ingredient names and ranks recipes by verified pantry matches and expiration priority.

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
| `src/features/pantry/` | Pantry screen, item details and form modal, loading/empty/error states, action journal, item rows, model, and device-local repository. Future inventory domain rules and flows belong here. |
| `src/features/recipes/` | Recipe types and provider boundaries, TheMealDB recipe access, screens, English ingredient catalogue, matching, and its device-local cache. |
| `src/components/ui/` | Reusable button, text, surface, and timed Undo feedback primitives. |
| `src/theme/` | Light and dark semantic color and spacing tokens. |
| `src/i18n/` | Typed English and Spanish messages and device-locale selection. |
| `assets/images/` | iOS and Android launcher images. |
| `.github/workflows/pr-checks.yml` | Pull request and post-merge CI for types, lint, tests, and both production bundles. |
| `eas.json` | EAS Build profiles for installable Android previews and production builds. |

Pantry data is **device-local**: `pantryRepository.ts` stores items as versioned JSON in `@react-native-async-storage/async-storage`, which works on iOS, Android, web, and Expo Go. Nothing is synced between devices, and uninstalling the app (or clearing browser site data) removes the pantry. Screens use the typed `PantryRepository` boundary, so a later move to SQLite or an account-synced backend does not require UI rewrites. Keep external product lookup and recipe providers in typed adapters beside their feature modules; statistics can get its own feature folder when implemented. Do not infer an expiration date from a barcode. The planned roadmap and open domain decisions are in the local project guide.

The recipe feature fetches TheMealDB's English ingredient catalogue from `list.php?i=list`, caches it locally for autocomplete, and stores a selected ingredient's provider, TheMealDB ID, and canonical English name with the pantry item. Automatic recipe searches use that canonical name with `filter.php?i=`; the ID remains the stable provider reference. Recommendation searches use the canonical name for linked foods and the entered name for manual foods. All valid packages from seven days past expiry onward are eligible, including fresh foods beyond five days; older expired packages and invalid dates are excluded. Duplicate names search once. Candidate recipes are deduplicated by provider and ID, then complete ingredients are loaded with `lookup.php?i=` before any result is shown. Exact normalized names and canonical links verify matches; duplicate packages and repeated recipe ingredients count once per distinct ingredient. Priority means seven days past expiry through five days ahead. Ranking compares priority matches, all matches, then nearest expiration (recently expired before upcoming), recipe name, and provider ID. Cards show present and missing ingredient names and scores, and details use the same matcher. Presence does not establish sufficient quantity or safe use of expired food. The add and edit forms use the same catalogue suggestions. A user can still save an unmatched food or continue offline. Up to three provider requests run concurrently.

Verified recipe details and searched ingredient names are stored in AsyncStorage. The app restores and ranks them as soon as the pantry loads, so opening Recipes does not repeat network work. New pantry ingredients load in the background, and saved data refreshes after 24 hours or when the user pulls down. Existing cards remain visible during refresh and offline use. Partial failures reuse the pantry's four-second bottom Undo snackbar, with Retry as its action, while successful recipes remain available. Loading, empty, and unavailable states stay within the recipe feature so pantry management remains available if TheMealDB is unavailable. The development key is suitable for educational work; production access must be settled before shipping the integration.

## Pantry actions and feedback

Recommendation code lives in `src/features/recipes/recommendations/`: `policy` defines windows; `preparation` validates and indexes packages; `matching` verifies full ingredients; `scoring` and `ranking` order explained results; `engine` composes pure rules; `loader`, storage, and the shared provider handle reusable provider data. Change a rule in its owning module, keeping the provider boundary and screens independent of domain logic.

The native bottom bar switches between Pantry and Recipes. Each pantry row is one button. It opens a details modal showing the food name, package expiration date, urgency, and recipe ingredient link status. Find recipes opens matching results for that linked ingredient, including foods outside the automatic suggestion window. Edit food opens the form in the same modal; saving returns to the pantry. Mark consumed removes the item from the active pantry and from shared recipe suggestions. There is no consumption history yet.

Ingredient suggestions, loading, and no-match feedback appear only while the food-name field is active. A saved manual food without a recipe ingredient shows a small hint in details and edit; it remains valid, and focusing the name field offers matches when the catalogue is available. An unchanged expired package date can be kept during an edit.

Edits and consumption show a bottom confirmation with Undo for four seconds. A thin bar beneath the message empties from right to left into the rounded edge to show the time remaining; then the message slides down. Rapid actions queue so each has its own Undo window and a fresh timer bar. Undo restores the prior fields, identity, and list position while retaining later changes. Additions do not currently offer Undo. Use this reusable bottom confirmation pattern for future update and delete actions. If a device write fails, the confirmation changes to a short failure message and the persistent storage warning remains visible.

## Code documentation

Use review-focused JSDoc (`/** ... */`) on production exports, including functions, components, hooks, types, interfaces, and provider objects. Start with a plain-language summary, use a separate paragraph for behavior or edge cases, then document every parameter and return value with `@param` and `@returns`. Add `@throws` only when the declaration can throw or reject, and name the relevant error cases. Document private helpers when their behavior or edge cases need explanation. Describe current behavior; keep planned APIs clearly identified as future work. Avoid repetitive comments on test helpers, inline callbacks, and trivial handlers.

Device-local storage is the agreed choice for this early pantry. A missing storage key starts with an empty pantry. If the saved JSON, format version, or an item is invalid, the app shows a load error and offers retry. It keeps the original stored value and blocks additions until loading succeeds, so damaged data is not silently replaced. A failed save leaves a visible warning; a later successful save clears it.

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

### Android APK builds

The project uses EAS Build for native Android artifacts. The Android
application ID is `com.zerofoodwaste.app`; keep it stable after release. The
`preview` profile uses internal distribution and produces an installable APK
for device testing. The `production` profile produces the default Android App
Bundle (AAB) intended for Google Play.

After logging in to an Expo account with `pnpm dlx eas-cli@latest login`, build
an APK from the release branch with:

```bash
pnpm dlx eas-cli@latest build --platform android --profile preview
```

EAS provides a download URL when the cloud build completes. Open that URL on
an Android device to install the APK, or download it and run
`adb install path/to/the-file.apk`. Keep Android signing credentials managed by
EAS and never commit them to the repository.

For a Google Play build, use the production profile instead:

```bash
pnpm dlx eas-cli@latest build --platform android --profile production
```

An APK build is for direct installation and internal testing; it is not the
normal Google Play submission artifact. EAS submission automation is
intentionally not part of the current CI workflow.

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

CI currently covers verification only. EAS builds, App Store or Play Store
publishing, and related secrets are outside this CI-only stage. Native builds
are started manually with the EAS CLI using the profiles documented above.

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
