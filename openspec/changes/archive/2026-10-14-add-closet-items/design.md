# Design

## Context

The repo is greenfield: it contains only OpenSpec scaffolding. This change creates both applications and the tooling that every later change will build on (see proposal.md, "Why"). The requirements are in `specs/closet-items`, `specs/categories`, and `specs/brands`.

The development machine is WSL2 with Node 22.22.1. Docker Desktop (with Compose) is available from WSL when it's running on Windows. No MongoDB server is installed. The project uses pnpm as its package manager.

Node 22.22.1 sets the upper bound on several framework versions, so this change pins: **Angular 21** (Angular 22 requires Node ≥22.22.3), **NestJS 11** (NestJS 12 is ESM-only, and Jest can only load ESM packages from CommonJS on Node ≥24.9), **Mongoose 8** (Mongoose 9's connection handshake fails inside Jest's module sandbox), **pnpm 10** (the `onlyBuiltDependencies` setting below; later majors renamed it), and **TypeScript 6.0** (within Angular 21's supported range). Upgrading Node to 24 would unblock Angular 22 and NestJS 12; that's left to a later change.

## Goals / Non-Goals

**Goals:**
- A repo layout and conventions that later changes (outfits, accounts, recommendations) can extend without restructuring.
- One backend module per capability, so each spec maps onto its own folder in the code.
- Every spec scenario has an automated test at the cheapest layer that can check it.
- The full test suite runs without a database server installed.

**Non-Goals:**
- Production deployment, hosting, or CI pipelines.
- Pagination or search on the closet list. A single user's closet is small enough to load at once.
- Offline support or caching in the web app.

## Decisions

### 1. Monorepo with pnpm workspaces

```
stylevault/
+-- package.json        root scripts; "packageManager": "pnpm@<version>"
+-- pnpm-workspace.yaml packages: api, web, shared, e2e
+-- docker-compose.yml  MongoDB for local development
+-- shared/             @stylevault/shared: fixed lists, hex pattern + normalizeHex
+-- api/                NestJS app
+-- web/                Angular app
+-- e2e/                Playwright smoke tests
```

**Why:** The API and the web app must agree on the fixed lists (slots, seasons, occasions) and the hex color format. A `shared` workspace package gives both sides one source of truth, so the lists can't drift apart. The apps depend on it with `"@stylevault/shared": "workspace:*"`. Root scripts use `pnpm -r` (for example `pnpm test`, `pnpm dev`) to run everything from one place. The pnpm version is pinned through the `packageManager` field. A standalone pnpm switches to the pinned version on its own; Corepack (`sudo corepack enable pnpm`) is the alternative, but enabling it needs root on this machine, so it's documented rather than required.

**Alternatives:** *Nx* adds caching and generators, but it brings a lot of tooling to learn for a two-app repo. *Separate repos* would need a published package to share the constants. *Duplicating the constants* in both apps is simpler, but the lists will drift as soon as one side changes.

### 2. Three Mongo collections, items reference by id

```
categories { _id, name, normalizedName (unique), slot, timestamps }
brands     { _id, name, normalizedName (unique), timestamps }
items      { _id, name, categoryId -> categories, brandId? -> brands,
             primaryColor, secondaryColor?, seasons[], occasions[],
             notes?, timestamps }
```

Items store `categoryId` and `brandId` as ObjectId references. Item responses are populated with `category: { id, name, slot }` and `brand: { id, name } | null`.

**Why:** Storing references means a rename automatically shows up on every item, which the rename requirements in both specs demand. It's also the shape that "future relations" on brands and slot-based outfit logic will need.

**Alternative:** Embedding the category and brand names in each item avoids the lookup, but every rename would then have to rewrite every matching item, and keeping those copies consistent becomes this change's problem.

### 3. Uniqueness through a stored `normalizedName` with a unique index

On every create or rename, the service sets `name = input.trim()` and `normalizedName = name.toLowerCase()`. A unique index on `normalizedName` enforces the "unique ignoring case and whitespace" rule. A duplicate-key error (Mongo code 11000) is translated into **409 Conflict**.

**Why:** The database enforces the rule even if two requests race, and the normalization is spelled out in code where tests can see it.

**Alternative:** A case-insensitive *collation* index (strength 2) handles letter case but not whitespace, and its behavior is harder to read and test. A service-level "check then insert" without an index is open to race conditions.

### 4. Referential rules enforced in services

- **Item create or update:** the service checks that `categoryId` exists, and that `brandId` exists when given. A missing reference returns **422** with detail such as "Category not found". The request is well-formed, but it points at something that doesn't exist. That's not 404, because the URL itself is fine.
- **Category or brand delete:** the service counts the items that reference it. If the count is greater than 0, it returns **409** with an `itemCount` extension member (see Decision 5). Otherwise it deletes.
- **Item delete:** removes only the item.

**Accepted risk:** without transactions, deleting a category at the same moment an item is created with it could leave a dangling reference. With a single user this is very unlikely. Item reads tolerate it by returning `category: null` instead of failing. Transactions would need a replica set, which is too much setup for this change.

### 5. REST API shape and validation

| Resource | Endpoints |
|---|---|
| Items | `GET /api/items` (newest first), `GET /api/items/:id`, `POST /api/items`, `PATCH /api/items/:id`, `DELETE /api/items/:id` |
| Categories | `GET /api/categories` (sorted by `normalizedName`), `POST`, `PATCH /:id` (name and/or slot), `DELETE /:id` |
| Brands | `GET /api/brands` (sorted by `normalizedName`), `POST`, `PATCH /:id` (name), `DELETE /:id` |

Request validation uses class-validator DTOs and a global `ValidationPipe` with `whitelist` and `transform` enabled. The DTOs import the allowed values, the hex pattern (`#RGB` or `#RRGGBB`), and `normalizeHex` from `@stylevault/shared`. A transform runs `normalizeHex`, which lowercases and expands `#fa0` to `#ffaa00`, so storage always holds one 6-digit form. It also trims names and notes, and removes repeated season and occasion values.

**Status codes** follow RFC 9110 semantics:

| Situation | Status |
|---|---|
| `POST` creates a resource | **201 Created**, `Location: /api/<resource>/<id>`, body is the new resource |
| `GET`, `PATCH` succeed | **200 OK** with the resource (or list) |
| `DELETE` succeeds | **204 No Content** |
| Body isn't parseable JSON | **400 Bad Request** |
| Body is well-formed but breaks a rule (missing or invalid field, value outside a fixed list, reference to a category or brand that doesn't exist) | **422 Unprocessable Content** |
| `:id` doesn't exist or isn't a valid id | **404 Not Found** |
| Name collides with an existing one, or delete blocked because items use it | **409 Conflict** |

`ValidationPipe` is configured with `errorHttpStatusCode: 422`, so DTO rule failures return 422, while body-parser errors keep their 400.

**Error bodies** use RFC 9457 Problem Details (`Content-Type: application/problem+json`) with `type`, `title`, `status`, and `detail`. A global exception filter converts Nest exceptions into this shape and adds extension members where useful: `errors: [{ field, message }]` for 422 responses, and `itemCount` for blocked deletes.

**Why:** the client and tests can branch on the status code alone, and the error body is a standard any HTTP client understands, instead of a format invented for this project.

**Alternative:** Nest's default `{ statusCode, message, error }` body with 400 for every validation failure. It's less work, but it's non-standard, and it can't tell malformed input apart from rule violations.

On `PATCH /api/items/:id`, sending `brandId: null` or `secondaryColor: null` clears that field.

**Why PATCH instead of PUT:** the edit form sends the whole item anyway, but PATCH makes "clear this optional field" explicit and costs nothing extra.

### 6. Angular app: standalone components, signals, Angular Material

Routes:

```
/closet              item list (empty state when there are no items)
/closet/new          item form
/closet/:id          item details
/closet/:id/edit     item form (edit)
/categories          list, rename, change slot, delete
/brands              list, rename, delete
```

- **Combobox:** a shared `CreatableComboboxComponent` built on Material's autocomplete. It filters existing options case-insensitively and adds a `Create '<text>'` option only when there's no exact normalized match. The category variant opens a small dialog to pick a slot before creating, and cancelling the dialog leaves the field unset.
- **Color input:** a hex text field paired with a native `<input type="color">` swatch. The picker can only produce and display `#rrggbb`, so the text field lets the user type `#FA0` or paste a code, and it's the source of truth. Typing a valid code updates the swatch, picking a color fills the text field, and invalid text shows a field error. The web app uses the same shared pattern and `normalizeHex` as the API, so both sides agree on what's valid. The secondary color has a "none" toggle.
- **Delete confirmation:** a Material confirm dialog. The API delete itself happens right away. Confirming is a UI concern.
- **Errors:** an HTTP interceptor reads Problem Details bodies. Messages from 422 `errors` entries are shown next to their fields, and 409 and other errors appear in a snackbar. For example, a blocked delete shows "Used by 4 items".
- **Dev proxy:** the Angular dev server proxies `/api` to the Nest port, so there's no CORS setup in development. The proxy config is `web/proxy.conf.mjs` rather than JSON, so the target port can come from `API_PORT` (default 3000), which lets the e2e stack point it elsewhere.

**Why Material:** it provides an accessible autocomplete, dialogs, and form fields out of the box, which covers the "clean, modern" style goal without building those widgets by hand.

**Alternative:** *Angular CDK only* gives more visual control but means hand-building the autocomplete overlay, keyboard navigation, and accessibility. *A third-party UI kit* adds a dependency with no clear benefit.

### 7. Testing strategy: each scenario tested at the cheapest layer

| Layer | Tool | Covers |
|---|---|---|
| API integration | Jest + Supertest + mongodb-memory-server | Every validation, uniqueness, reference, ordering, and delete-blocking scenario, tested through real HTTP against a real (in-memory) Mongo |
| API unit | Jest | Small pure logic, such as name normalization and the hex transform |
| Web components | Vitest | Combobox match/create behavior, the inline slot dialog, form required-field and color handling, empty state, delete confirmation |
| End-to-end smoke | Playwright | (1) add an item with a new category and brand inline, then see it in the list; (2) a blocked delete shows the item count |

Each API integration test file starts its own in-memory Mongo and clears the collections between tests. For Playwright, a small `e2e` start script boots an in-memory Mongo, starts the API against it, and serves the web app. The smoke tests are then hermetic, and no test needs a local database install. The e2e stack uses its own ports (API 3100, web 4300), so it doesn't clash with a running `pnpm dev`.

**Why:** most scenarios are about server-side rules, and HTTP-level tests check them exactly as the spec words them. Playwright is kept for a few checks that the two apps work together.

### 8. Configuration and local MongoDB

The API reads `MONGODB_URI` and `PORT` from the environment, with defaults for local development. A committed `.env.example` documents them.

For day-to-day development, a `docker-compose.yml` runs a single `mongo` service with a named volume, so closet data survives restarts. The default `MONGODB_URI` points at it. Tests never use it (Decision 7).

**Alternatives:** *Installing MongoDB Community directly in WSL* means one less moving part, but every contributor has to install and manage the service by hand. *MongoDB Atlas* needs an account and network access, which isn't worth it for local work.

## Risks / Trade-offs

- [Docker Desktop must be running on Windows for `docker compose` to work in WSL] → The README says to start it first. Tests don't depend on Docker, so they still work without it.
- [pnpm skips dependency install scripts unless they're allowed] → List the packages that need them under the `onlyBuiltDependencies` setting in `pnpm-workspace.yaml`: `@parcel/watcher`, `esbuild`, `lmdb`, `msgpackr-extract`, `mongodb-memory-server`, and `unrs-resolver`. mongodb-memory-server downloads its MongoDB binary on first use either way, so the first test run is slow and needs network access. Later runs use the cached binary.
- [pnpm's strict `node_modules` exposes undeclared dependencies] → Declare every import explicitly in each workspace's `package.json`. Don't rely on hoisting.
- [Framework versions are held back by Node 22.22.1] → Pinned as described in Context. Moving to Node 24 is the upgrade path.
- [Dangling references without transactions] → Accepted for single-user use (Decision 4). Reads return `null` instead of failing.
- [Material's default look may feel generic] → Set a custom theme (palette and typography) in setup. A deeper visual design can come in a later change.
- [Adding user accounts later touches all three collections] → Expected and called out in the proposal. Every query goes through a service, so adding owner scoping later only means editing the services.

## Migration Plan

Not applicable: no existing data or deployment. Rolling back means reverting the change.
