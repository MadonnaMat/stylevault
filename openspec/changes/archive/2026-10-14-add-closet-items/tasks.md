# Tasks

## 1. Workspace and tooling setup

- [x] 1.1 Create the root pnpm workspace: `package.json` with a `packageManager` pnpm pin, `pnpm-workspace.yaml` (api, web, shared, e2e), `.nvmrc`, `.gitignore`; pin pnpm via `packageManager` (Corepack optional; see design.md Decision 1); verify `pnpm install` succeeds from the repo root
- [x] 1.2 Add `docker-compose.yml` with a `mongo` service and named volume, plus `.env.example` (`MONGODB_URI`, `PORT`); verify `docker compose up -d` starts Mongo and `docker compose exec mongo mongosh --eval "db.runCommand({ping:1})"` returns ok
- [x] 1.3 Create the `@stylevault/shared` package exporting the slot, season, and occasion lists, the hex color pattern (`#RGB` or `#RRGGBB`), and `normalizeHex`; verify unit tests for the pattern (accepts 3- and 6-digit in any case, rejects alpha forms, missing `#`, and non-hex digits) and for `normalizeHex` (lowercases and expands short forms), and that the package can be imported from another workspace via `workspace:*`
- [x] 1.4 Scaffold the NestJS app in `api/` with Mongoose, env config, the `/api` global prefix, and a global `ValidationPipe` (`whitelist`, `transform`, `errorHttpStatusCode: 422`); verify `pnpm --filter api start:dev` boots and connects to the Compose Mongo
- [x] 1.5 Add the API test harness: Jest + Supertest + a mongodb-memory-server helper that starts the in-memory DB, clears collections between tests, and stops it afterwards; set `onlyBuiltDependencies` as needed; verify a smoke test (unknown route returns 404) passes with `pnpm --filter api test`
- [x] 1.6 Add a global exception filter that returns RFC 9457 Problem Details (`application/problem+json`, with `errors` for 422 and `itemCount` extensions); verify API tests that a malformed JSON body returns 400, a DTO rule failure returns 422 with `errors`, and a thrown 404 and 409 each have the problem+json shape
- [x] 1.7 Scaffold the Angular app in `web/` (standalone, routing, Angular Material with a custom theme, Vitest, `/api` dev proxy to the Nest port); verify `pnpm --filter web test` runs and the dev server proxies `/api` requests to the API
- [x] 1.8 Add root scripts `pnpm dev` (API + web) and `pnpm test` (all workspaces); verify both work from the repo root
- [x] 1.9 Write `README.md` setup instructions (start Docker Desktop, Corepack/pnpm, `docker compose up -d`, `pnpm dev`, `pnpm test`); verify by following them from a fresh clone

## 2. Categories API

- [x] 2.1 Add the Category schema (`name`, `normalizedName` with unique index, `slot`, timestamps) and the name-normalization helper; verify unit tests cover trimming and lowercasing
- [x] 2.2 Implement `POST /api/categories` with DTO validation (non-empty name, slot from the shared list), returning 201 with a `Location` header; verify API tests for the status and header and for every scenario of "Create a category with a slot"
- [x] 2.3 Translate duplicate-key errors into 409 Conflict (Problem Details) for categories; verify API tests for every scenario of "Category names are unique ignoring case and whitespace"
- [x] 2.4 Implement `GET /api/categories` sorted by `normalizedName`; verify API tests for "List categories"
- [x] 2.5 Implement `PATCH /api/categories/:id` for name and slot (404 for unknown ids); verify API tests for "Rename a category" (rename and duplicate rejection) and "Change a category's slot"

## 3. Brands API

- [x] 3.1 Add the Brand schema (`name`, `normalizedName` with unique index, timestamps), reusing the normalization helper; verify the unique index exists in a test
- [x] 3.2 Implement `POST /api/brands` with DTO validation, 201 with `Location`, and 409 on duplicates; verify API tests for every scenario of "Create a brand" and "Brand names are unique ignoring case and whitespace"
- [x] 3.3 Implement `GET /api/brands` sorted by `normalizedName`; verify API tests for "List brands"
- [x] 3.4 Implement `PATCH /api/brands/:id` for renaming (404 for unknown ids); verify API tests for "Rename a brand" (rename and duplicate rejection)

## 4. Items API

- [x] 4.1 Add the Item schema and DTOs using the shared lists, with transforms that trim name and notes, normalize hex colors with `normalizeHex`, and remove repeated seasons and occasions; verify unit tests for each transform
- [x] 4.2 Implement `POST /api/items` with category and brand existence checks (422 "not found" detail), returning 201 with `Location`; verify API tests for every scenario of "Add an item to the closet", the API scenarios of "Item colors are hex values", "Items reference existing categories and brands", and "Seasons and occasions come from fixed lists"
- [x] 4.3 Implement `GET /api/items` (newest first) and `GET /api/items/:id` with populated `category` and `brand` (`null` when missing or dangling) and 404 for unknown ids; verify API tests for the ordering in "View the closet", the API scenarios of "View an item's details", and the "items show the new name" scenarios of "Rename a category" and "Rename a brand"
- [x] 4.4 Implement `PATCH /api/items/:id` with the same validation, `null` clearing `brandId` and `secondaryColor`, and no change on rejection; verify API tests for every scenario of "Edit an item"
- [x] 4.5 Implement `DELETE /api/items/:id` (204 on success, 404 for unknown ids); verify API tests for the API scenarios of "Delete an item", including that the category and brand still exist afterwards

## 5. Delete guards for categories and brands

- [x] 5.1 Implement `DELETE /api/categories/:id`: 204 when unused, otherwise 409 Problem Details with `itemCount`, 404 for unknown ids; verify API tests for every scenario of "Delete a category only when unused"
- [x] 5.2 Implement `DELETE /api/brands/:id` the same way; verify API tests for every scenario of "Delete a brand only when unused"

## 6. Web: API client and creatable comboboxes

- [x] 6.1 Add typed Angular services for items, categories, and brands (typed with the shared lists); plus an interceptor that parses Problem Details; verify Vitest tests with `HttpTestingController` cover each endpoint call and that 400, 404, 409, and 422 responses (including 422 field `errors`) are surfaced
- [x] 6.2 Build `CreatableComboboxComponent` on Material autocomplete (case-insensitive filtering, `Create '<text>'` only when there's no exact normalized match); verify Vitest tests for the matching and exact-match-different-case scenarios
- [x] 6.3 Add the category variant with a slot-picker dialog that creates and then selects the new category; verify Vitest tests for every scenario of "Create a category while filling in an item", including cancel leaving the field unset
- [x] 6.4 Add the brand variant (creates and selects immediately, field may stay empty); verify Vitest tests for every scenario of "Create a brand while filling in an item"

## 7. Web: closet screens

- [x] 7.1 Build the `/closet` list page (name, category, brand, color swatches, newest first) with an empty state linking to add an item; verify Vitest tests for every scenario of "View the closet"
- [x] 7.2 Build the item form for `/closet/new` and `/closet/:id/edit` (required name, category, and primary color; hex text fields paired with native color swatches, accepting 3- or 6-digit codes, with a "none" toggle for the secondary color; season and occasion multi-selects; notes; field-level API error display); verify Vitest tests for the UI scenarios of "Add an item to the closet", "Item colors are hex values", and "Edit an item"
- [x] 7.3 Build the `/closet/:id` details page showing every attribute, the category's slot, and color swatches, plus a not-found state; verify Vitest tests for every scenario of "View an item's details" and the swatch scenario of "Item colors are hex values"
- [x] 7.4 Add delete with a Material confirm dialog from the details page; verify Vitest tests for the confirmed and cancelled scenarios of "Delete an item"

## 8. Web: category and brand management

- [x] 8.1 Build the `/categories` page (alphabetical list with slots, inline rename, slot change, delete showing "Used by N items" on 409); verify Vitest tests for the UI scenarios of "List categories", "Rename a category", "Change a category's slot", and "Delete a category only when unused"
- [x] 8.2 Build the `/brands` page (alphabetical list, inline rename, delete showing "Used by N items" on 409); verify Vitest tests for the UI scenarios of "List brands", "Rename a brand", and "Delete a brand only when unused"
- [x] 8.3 Add app navigation between Closet, Categories, and Brands; verify a Vitest routing test that each nav link reaches its page

## 9. End-to-end smoke tests and final checks

- [x] 9.1 Create the `e2e` workspace with Playwright and a start script that boots an in-memory Mongo, starts the API against it, and serves the web app; verify `pnpm e2e` launches the stack and tears it down
- [x] 9.2 Write a smoke test: add an item, creating a new category (with slot) and a new brand inline, then see it in the closet list; verify it passes with `pnpm e2e`
- [x] 9.3 Write a smoke test: deleting a category that an item uses shows "Used by 1 item" and the category remains; verify it passes with `pnpm e2e`
- [x] 9.4 Document `pnpm e2e` (including the one-time `pnpm --filter e2e exec playwright install chromium`) in `README.md`; verify the command runs as written
- [x] 9.5 Run the full suite: `pnpm test`, `pnpm e2e`, and `openspec validate add-closet-items --strict`; verify all pass

## Workflow follow-up

- Review the implementation against the three delta specs, then archive the change with `/opsx:archive` so the specs move into `openspec/specs/`.
- After archiving, verify `openspec list --specs` shows `closet-items`, `categories`, and `brands`.
