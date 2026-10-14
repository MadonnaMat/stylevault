# Spec Delta

## Purpose

Lets the user record the brands of their garments as named records they create themselves, so a brand is entered once and reused across items.

## ADDED Requirements

### Requirement: Create a brand
The system SHALL allow the user to create a brand with a name. The name is stored with surrounding whitespace removed and MUST NOT be empty.

#### Scenario: Creating a brand
- **WHEN** the user creates a brand named "Uniqlo"
- **THEN** the brand is saved with that name

#### Scenario: Empty name
- **WHEN** the user creates a brand whose name is empty or only whitespace
- **THEN** the brand is not created
- **AND** the user is told that a name is required

### Requirement: Brand names are unique ignoring case and whitespace
No two brands SHALL share a name when compared case-insensitively after removing surrounding whitespace. Creating or renaming a brand to a name that matches an existing one MUST be rejected.

#### Scenario: Duplicate name with different case and spacing
- **WHEN** a brand "Nike" exists and the user creates a brand named "nike "
- **THEN** the brand is not created
- **AND** the user is told a brand with that name already exists

#### Scenario: Name is trimmed on save
- **WHEN** the user creates a brand named "  Levi's  "
- **THEN** the brand is saved with the name "Levi's"

### Requirement: Create a brand while filling in an item
While adding or editing an item, the brand field SHALL offer existing brands as the user types and SHALL offer to create a new brand when the typed name matches none of them. Creating one this way MUST select the new brand on the item. The field can be left empty.

#### Scenario: Typing matches an existing brand
- **WHEN** the user types "ni" in the brand field and "Nike" exists
- **THEN** "Nike" is offered for selection

#### Scenario: Typed name matches an existing brand exactly but in a different case
- **WHEN** the user types "nike" and "Nike" exists
- **THEN** "Nike" is offered
- **AND** no option to create a new brand is offered

#### Scenario: Creating a new brand inline
- **WHEN** the user types "Patagonia" and chooses to create it
- **THEN** the brand "Patagonia" is created
- **AND** it is selected as the item's brand

#### Scenario: Leaving the brand empty
- **WHEN** the user leaves the brand field empty
- **THEN** no brand is created and the item has no brand

### Requirement: List brands
The system SHALL list all brands in alphabetical order (case-insensitive).

#### Scenario: Listing brands
- **WHEN** brands "uniqlo", "Nike", and "Arc'teryx" exist and the user views brands
- **THEN** they are listed as "Arc'teryx", "Nike", "uniqlo"

### Requirement: Rename a brand
The system SHALL let the user rename a brand, subject to the same uniqueness rule. Items with that brand MUST show the new name.

#### Scenario: Renaming a brand
- **WHEN** the user renames "Levis" to "Levi's"
- **THEN** the brand has the new name
- **AND** every item with that brand shows "Levi's"

#### Scenario: Renaming to an existing name
- **WHEN** brands "Nike" and "Nikey" exist and the user renames "Nikey" to "NIKE"
- **THEN** the rename is rejected
- **AND** "Nikey" keeps its name

### Requirement: Delete a brand only when unused
The system SHALL let the user delete a brand that no item uses. Deleting a brand that one or more items use MUST be rejected, and the user MUST be told how many items use it.

#### Scenario: Deleting an unused brand
- **WHEN** the user deletes a brand that no item uses
- **THEN** the brand is removed

#### Scenario: Deleting a brand in use
- **WHEN** the user deletes a brand that 2 items use
- **THEN** the deletion is rejected
- **AND** the user is told the brand is used by 2 items

#### Scenario: Deleting a brand that does not exist
- **WHEN** the user tries to delete a brand that does not exist
- **THEN** the system reports that the brand was not found
