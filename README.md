# StyleVault

A closet organization tool and outfit recommender. This repo is a pnpm workspace:

| Folder    | What it is                                                         |
|-----------|--------------------------------------------------------------------|
| `api/`    | NestJS REST API backed by MongoDB (Mongoose), served under `/api`  |
| `web/`    | Angular app (Angular Material), proxies `/api` to the API in dev   |
| `shared/` | `@stylevault/shared`: fixed lists and hex color rules used by both |
| `e2e/`    | Playwright smoke tests                                             |

## Prerequisites

- **Node.js 22.12 or newer** (see `.nvmrc`).
- **pnpm**, at the version pinned in `package.json` (`packageManager`). Either:
  - enable Corepack once, which installs the pinned version for you: `sudo corepack enable pnpm`, or
  - use a standalone pnpm (`npm install -g pnpm` or the pnpm installer). pnpm switches itself to the pinned version automatically.
- **Docker Desktop**, for the local MongoDB. On Windows with WSL, start Docker Desktop on Windows first so `docker` works inside WSL. The tests don't need Docker.

## Setup

```bash
pnpm install              # installs every workspace and builds @stylevault/shared
cp .env.example .env      # optional: the defaults already match docker-compose.yml
docker compose up -d      # starts MongoDB on localhost:27017 (data persists in a named volume)
```

## Run the app

```bash
pnpm dev
```

This starts the API on http://localhost:3000/api and the web app on http://localhost:4200. Open the web app; its dev server forwards `/api` requests to the API.

Configuration (environment variables or `.env` at the repo root):

| Variable      | Default                                   |
|---------------|-------------------------------------------|
| `MONGODB_URI` | `mongodb://localhost:27017/stylevault`    |
| `PORT`        | `3000`                                    |

Stop MongoDB with `docker compose down` (add `-v` to also delete the closet data).

## Tests

```bash
pnpm test
```

Runs the unit and API tests in every workspace: Vitest for `shared` and `web`, Jest + Supertest for `api`. The API tests use an in-memory MongoDB (mongodb-memory-server), so no database needs to be running. The first run downloads a MongoDB binary, so it needs network access and takes longer.

To run one workspace: `pnpm --filter api test`, `pnpm --filter web test`, or `pnpm --filter @stylevault/shared test`.

## End-to-end smoke tests

The Playwright smoke tests in `e2e/` run against a throwaway stack: `e2e/start-stack.mjs` boots an in-memory MongoDB, starts the API against it on port 3100, and serves the web app on port 4300. Neither Docker nor `pnpm dev` needs to be running, and the ports don't clash with `pnpm dev`.

Once per machine (and again after upgrading Playwright), download the browser:

```bash
pnpm --filter e2e exec playwright install chromium
```

Then run:

```bash
pnpm e2e
```

Playwright starts the stack, runs the tests, and shuts everything down. If Chromium fails to launch because of missing system libraries (common on a fresh WSL or Linux install), run `sudo pnpm --filter e2e exec playwright install-deps chromium` once.
