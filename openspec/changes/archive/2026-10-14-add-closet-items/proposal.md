# Proposal

## Why

StyleVault has no code yet, and everything it is meant to do (outfits, recommendations) depends on first knowing what clothes the user owns. This change builds that foundation: a single closet where the user can catalog garments with structured attributes that later outfit and recommendation features can reason about.

## What Changes

- Set up the project skeleton: a NestJS API backed by MongoDB, an Angular web app, and the test tooling for both, plus end-to-end smoke tests.
- Add closet items: a user can add, view, edit, and delete garments. Each garment has a name, a category, an optional brand, a required primary color and optional secondary color (hex values), seasons and occasions from fixed lists, and free-text notes.
- Add categories as their own records. The user can create them free-form while filling in an item, and they then appear in a dropdown. Each category has a fixed **slot** (top, bottom, outerwear, shoes, accessory, full-body) so future outfit logic knows where a garment is worn.
- Add brands as their own records, with the same create-while-typing dropdown behavior. Brands are kept separate so they can gain relations later.
- Category and brand names are unique, ignoring case and surrounding whitespace. They can be renamed, and they can only be deleted when no item uses them.
- Single closet with no user accounts. Every item, category, and brand belongs to the one closet.

Out of scope: user accounts and authentication, garment photos, outfits, recommendations, and extending the season and occasion lists.

## Capabilities

### New Capabilities
- `closet-items`: Cataloging garments in the closet: creating, viewing, editing, and deleting items and their attributes (name, category, brand, colors, seasons, occasions, notes).
- `categories`: User-defined garment categories, each with a fixed slot. Covers creating, listing, renaming, changing the slot, name uniqueness, and the rule that a category in use cannot be deleted.
- `brands`: User-defined brands. Covers creating, listing, renaming, name uniqueness, and the rule that a brand in use cannot be deleted.

### Modified Capabilities
<!-- None: there are no existing specs. -->

## Impact

- **New code**: a NestJS API application and an Angular web application. The repo currently contains only OpenSpec scaffolding.
- **New dependencies**: NestJS, Mongoose, Angular, Jest, Supertest, mongodb-memory-server, Vitest, Playwright.
- **Infrastructure**: local development needs a MongoDB instance. Automated tests use an in-memory MongoDB, so they don't need one.
- **HTTP API**: new REST endpoints for items, categories, and brands, consumed by the Angular app.
- **Future changes**: user accounts will need to add ownership to all three capabilities. Outfits will depend on category slots.
