# closet-items Specification

## Purpose

Lets the user catalog the garments they own in a single closet, recording structured attributes (category, brand, colors, seasons, occasions) that later outfit and recommendation features can build on.

## Requirements

### Requirement: Add an item to the closet
The system SHALL allow the user to add a garment to the closet. An item MUST have a name, a category, and a primary color. Brand, secondary color, seasons, occasions, and notes are optional. Names and notes are stored with surrounding whitespace removed.

#### Scenario: Adding an item with all required fields
- **WHEN** the user submits a new item with name "Navy wool blazer", an existing category, and primary color "#1f2a44"
- **THEN** the item is saved to the closet
- **AND** it appears in the closet list

#### Scenario: Adding an item with every optional field
- **WHEN** the user submits a new item that also includes a brand, a secondary color, seasons, occasions, and notes
- **THEN** the item is saved with all of those values

#### Scenario: Missing name
- **WHEN** the user submits a new item whose name is empty or only whitespace
- **THEN** the item is not saved
- **AND** the user is told that a name is required

#### Scenario: Missing category
- **WHEN** the user submits a new item without a category
- **THEN** the item is not saved
- **AND** the user is told that a category is required

#### Scenario: Missing primary color
- **WHEN** the user submits a new item without a primary color
- **THEN** the item is not saved
- **AND** the user is told that a primary color is required

### Requirement: Item colors are hex values
An item's primary color and optional secondary color SHALL be hex colors in `#RGB` or `#RRGGBB` form, in any letter case. Colors are stored as lowercase `#rrggbb`, with short forms expanded by doubling each digit. Any other format, including forms with transparency, MUST be rejected.

#### Scenario: Six-digit hex colors
- **WHEN** the user saves an item with primary color "#1F2A44" and secondary color "#C0A060"
- **THEN** the item is saved with primary color "#1f2a44" and secondary color "#c0a060"

#### Scenario: Three-digit hex color
- **WHEN** the user saves an item with primary color "#FA0"
- **THEN** the item is saved with primary color "#ffaa00"

#### Scenario: Invalid hex color
- **WHEN** the user saves an item with a color of "navy", "#12345", "1f2a44", "#ggg", or "#1f2a44cc"
- **THEN** the item is not saved
- **AND** the user is told which color is invalid

#### Scenario: No secondary color
- **WHEN** the user saves an item without a secondary color
- **THEN** the item is saved with no secondary color

#### Scenario: Colors are shown as swatches
- **WHEN** the user views an item that has a primary and a secondary color
- **THEN** both colors are displayed as visible color swatches

### Requirement: Items reference existing categories and brands
An item's category MUST be an existing category. If a brand is given, it MUST be an existing brand. An item can have no brand.

#### Scenario: Unknown category
- **WHEN** the user saves an item that references a category that does not exist
- **THEN** the item is not saved
- **AND** the user is told the category was not found

#### Scenario: Unknown brand
- **WHEN** the user saves an item that references a brand that does not exist
- **THEN** the item is not saved
- **AND** the user is told the brand was not found

#### Scenario: Item without a brand
- **WHEN** the user saves an item with no brand
- **THEN** the item is saved and displays no brand

### Requirement: Seasons and occasions come from fixed lists
An item's seasons SHALL be zero or more of: spring, summer, fall, winter. An item's occasions SHALL be zero or more of: casual, work, formal, athletic. Any other value MUST be rejected. Each value is stored at most once per item.

#### Scenario: Selecting several seasons and occasions
- **WHEN** the user saves an item with seasons "fall" and "winter" and occasion "work"
- **THEN** the item is saved with exactly those seasons and that occasion

#### Scenario: Unknown season or occasion
- **WHEN** the user saves an item with season "monsoon" or occasion "party"
- **THEN** the item is not saved
- **AND** the user is told which value is not allowed

#### Scenario: No seasons or occasions
- **WHEN** the user saves an item with no seasons and no occasions
- **THEN** the item is saved with empty season and occasion lists

#### Scenario: Repeated value
- **WHEN** the user saves an item whose seasons include "winter" twice
- **THEN** the item is saved with "winter" listed once

### Requirement: View the closet
The system SHALL show the user a list of every item in the closet, newest first. Each entry shows the item's name, category name, brand name (if any), and color swatches.

#### Scenario: Closet with items
- **WHEN** the user opens the closet and it contains items
- **THEN** every item is listed, most recently added first
- **AND** each entry shows its name, category, brand if any, and color swatches

#### Scenario: Empty closet
- **WHEN** the user opens the closet and it contains no items
- **THEN** an empty state is shown that invites the user to add their first item

### Requirement: View an item's details
The system SHALL let the user view a single item with all of its attributes.

#### Scenario: Viewing an existing item
- **WHEN** the user opens an item from the closet list
- **THEN** its name, category and the category's slot, brand, colors, seasons, occasions, and notes are shown

#### Scenario: Item does not exist
- **WHEN** the user requests an item that does not exist
- **THEN** the system reports that the item was not found

### Requirement: Edit an item
The system SHALL let the user change any attribute of an existing item. Edits follow the same validation rules as adding an item. A rejected edit MUST leave the item unchanged.

#### Scenario: Successful edit
- **WHEN** the user changes an item's name and occasions and saves
- **THEN** the item is updated with the new values

#### Scenario: Removing optional values
- **WHEN** the user clears an item's brand and secondary color and saves
- **THEN** the item is saved with no brand and no secondary color

#### Scenario: Invalid edit
- **WHEN** the user edits an item to have an invalid primary color and saves
- **THEN** the edit is rejected
- **AND** the stored item keeps its previous values

#### Scenario: Editing an item that does not exist
- **WHEN** the user tries to edit an item that does not exist
- **THEN** the system reports that the item was not found

### Requirement: Delete an item
The system SHALL let the user delete an item after confirming. Deleting an item MUST NOT delete its category or brand.

#### Scenario: Confirmed delete
- **WHEN** the user deletes an item and confirms
- **THEN** the item is removed from the closet
- **AND** its category and brand still exist

#### Scenario: Cancelled delete
- **WHEN** the user starts to delete an item and then cancels
- **THEN** the item remains in the closet

#### Scenario: Deleting an item that does not exist
- **WHEN** the user tries to delete an item that does not exist
- **THEN** the system reports that the item was not found
