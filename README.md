ZeroFoodWaste is an application designed to combat domestic food waste, supporting the United Nations Sustainable Development Goal 12 (Responsible Consumption and Production). The system will act as a digital pantry: when users buy food, they can log the items they have bought along with their quantities and expiration dates.

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

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
