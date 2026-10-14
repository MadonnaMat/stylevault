# categories Specification

## Purpose

Lets the user define their own garment categories by name, while giving each one a fixed slot so the system knows where on the body a garment is worn.

## Requirements

### Requirement: Create a category with a slot
The system SHALL allow the user to create a category with a name and a slot. The slot MUST be one of: top, bottom, outerwear, shoes, accessory, full-body. The name is stored with surrounding whitespace removed and MUST NOT be empty.

#### Scenario: Creating a category
- **WHEN** the user creates a category named "Blazers" with slot "outerwear"
- **THEN** the category is saved with that name and slot

#### Scenario: Missing slot
- **WHEN** the user creates a category without a slot
- **THEN** the category is not created
- **AND** the user is told that a slot is required

#### Scenario: Unknown slot
- **WHEN** the user creates a category with slot "headwear"
- **THEN** the category is not created
- **AND** the user is told the slot is not allowed

#### Scenario: Empty name
- **WHEN** the user creates a category whose name is empty or only whitespace
- **THEN** the category is not created
- **AND** the user is told that a name is required

### Requirement: Category names are unique ignoring case and whitespace
No two categories SHALL share a name when compared case-insensitively after removing surrounding whitespace. Creating or renaming a category to a name that matches an existing one MUST be rejected.

#### Scenario: Duplicate name with different case and spacing
- **WHEN** a category "Shirts" exists and the user creates a category named " shirts "
- **THEN** the category is not created
- **AND** the user is told a category with that name already exists

#### Scenario: Name is trimmed on save
- **WHEN** the user creates a category named "  Sneakers  "
- **THEN** the category is saved with the name "Sneakers"

### Requirement: Create a category while filling in an item
While adding or editing an item, the category field SHALL offer existing categories as the user types and SHALL offer to create a new category when the typed name matches none of them. Creating one this way MUST ask for its slot and then select the new category on the item.

#### Scenario: Typing matches an existing category
- **WHEN** the user types "shi" in the category field and "Shirts" exists
- **THEN** "Shirts" is offered for selection

#### Scenario: Typed name matches an existing category exactly but in a different case
- **WHEN** the user types "shirts" and "Shirts" exists
- **THEN** "Shirts" is offered
- **AND** no option to create a new category is offered

#### Scenario: Creating a new category inline
- **WHEN** the user types "Cardigans", chooses to create it, and picks slot "top"
- **THEN** the category "Cardigans" with slot "top" is created
- **AND** it is selected as the item's category

#### Scenario: Cancelling inline creation
- **WHEN** the user chooses to create a new category but cancels before picking a slot
- **THEN** no category is created
- **AND** the item's category stays unset

### Requirement: List categories
The system SHALL list all categories in alphabetical order (case-insensitive), each with its slot.

#### Scenario: Listing categories
- **WHEN** categories "shoes-casual", "Blazers", and "Cardigans" exist and the user views categories
- **THEN** they are listed as "Blazers", "Cardigans", "shoes-casual", each with its slot

### Requirement: Rename a category
The system SHALL let the user rename a category, subject to the same uniqueness rule. Items using the category MUST show the new name.

#### Scenario: Renaming a category
- **WHEN** the user renames "Blazers" to "Jackets & Blazers"
- **THEN** the category has the new name
- **AND** every item in that category shows "Jackets & Blazers"

#### Scenario: Renaming to an existing name
- **WHEN** categories "Shirts" and "Tees" exist and the user renames "Tees" to "SHIRTS"
- **THEN** the rename is rejected
- **AND** "Tees" keeps its name

### Requirement: Change a category's slot
The system SHALL let the user change a category's slot to any other allowed slot.

#### Scenario: Changing the slot
- **WHEN** the user changes "Cardigans" from slot "top" to slot "outerwear"
- **THEN** the category's slot is "outerwear"

#### Scenario: Changing to an unknown slot
- **WHEN** the user changes a category's slot to "headwear"
- **THEN** the change is rejected
- **AND** the category keeps its previous slot

### Requirement: Delete a category only when unused
The system SHALL let the user delete a category that no item uses. Deleting a category that one or more items use MUST be rejected, and the user MUST be told how many items use it.

#### Scenario: Deleting an unused category
- **WHEN** the user deletes a category that no item uses
- **THEN** the category is removed

#### Scenario: Deleting a category in use
- **WHEN** the user deletes a category that 4 items use
- **THEN** the deletion is rejected
- **AND** the user is told the category is used by 4 items

#### Scenario: Deleting a category that does not exist
- **WHEN** the user tries to delete a category that does not exist
- **THEN** the system reports that the category was not found
