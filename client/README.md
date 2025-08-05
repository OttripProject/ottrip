# Ottrip Client

React Native (Expo) application written in TypeScript for the **Ottrip** travel-planning platform.

---

## Getting Started

### Requirements

- **mise** – toolchain manager used to pin Node, pnpm, and other utilities
- **pnpm** – package manager (activated via corepack)
- **Expo CLI / EAS CLI** – installed automatically via pnpm scripts

### 1. Repository setup

```bash
# trust the toolchain manifest & install required runtimes
mise trust
mise i

# enable the repo-specified pnpm version
corepack enable
```

### 2. Authenticate with Expo & load environment variables

```bash
# login to your Expo/EAS account (opens browser)
eas login

# pull development env vars; creates .env.local if successful
pnpm env:pull
```

### 3. Install dependencies & run the dev server

```bash
# install node modules
pnpm i

# start Expo dev server (web, iOS, Android)
pnpm dev
```

---

## Available Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `pnpm dev`      | Run Expo dev server               |
| `pnpm android`  | Build & run on Android device     |
| `pnpm ios`      | Build & run on iOS simulator      |
| `pnpm lint`     | Run ESLint with auto-fix          |
| `pnpm test`     | Run Jest test suite              |

> Additional scripts live in `package.json`.

---

## Project Structure (convention-first)

```
client/
├── assets/          # static assets (images, fonts)
│
├── src/
│   ├── components/      # shared UI components
│   ├── screens/         # React Navigation screens
│   ├── navigation/      # navigation configuration
│   ├── services/        # API clients, data layers
│   ├── hooks/           # reusable React hooks
│   └── contexts/        # React Context providers
├── .env.example         # documented env vars template
├── .eslintrc.js         # ESLint config (typescript)
├── .prettierrc          # Prettier formatting rules
├── package.json
├── tsconfig.json        # TypeScript compiler options
└── README.md            # you are here
```

Feel free to adjust or extend folders as the codebase grows.

---

## Platform-specific components

React Native automatically resolves files by platform suffix. We use it to have web-specific implementations when needed.

```
src/components/Button.native.tsx   // iOS & Android
src/components/Button.web.tsx      // Web only
```

Keep shared logic in the default file and only branch when required.

---

## Contributing Guidelines

1. All commits are linted & formatted automatically via **Husky** pre-commit hooks.
2. Write type-safe code and prefer explicit types over `any`.
3. Add or update tests when modifying business logic.
4. Keep environment variables documented in `.env.example`.

---

## License

© 2024 Ottrip. All rights reserved. Licensed under the MIT License unless noted otherwise. 