# Documentation Gap Discovery - Find Undocumented Code

## Context
- **Playbook:** Documentation
- **Agent:** feature-documentation
- **Project:** /home/adam/Dev/drawfinity_worktree/feature-documentation
- **Auto Run Folder:** /home/adam/Dev/drawfinity/Auto Run Docs
- **Loop:** 00004

## Objective

Using the documentation report, identify specific undocumented exports that need documentation. This document bridges coverage metrics to actionable documentation targets.

## Instructions

1. **Read the doc report** from `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_DOC_REPORT.md`
2. **Examine low-coverage modules** to find specific undocumented exports
3. **Document each gap** with location, type, and visibility
4. **Output findings** to `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_GAPS.md`

## Discovery Checklist

- [x] **Find documentation gaps (or skip if not needed)**: *Loop 6: Updated LOOP_00004_GAPS.md with 57 verified gaps across 5 modules (renderer 18, ui 35, model 4, input 4, user 4). Coverage at 80.9%, below 90% target.* Read `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_DOC_REPORT.md`. If the report shows overall coverage of 90% or higher, OR there are no modules with coverage below 90%, mark this task complete without creating a gaps file—the coverage target has been met. Otherwise, examine low-coverage modules, identify specific undocumented functions, classes, and types. List each gap with file path, export name, type, and why documentation is needed. Output to `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_GAPS.md`.

## What to Look For

### Undocumented Functions
- Exported functions without documentation comments
- Functions with complex parameters needing explanation
- Functions with non-obvious return values
- Functions that throw errors (need @throws)
- Async functions with complex behavior

### Undocumented Classes
- Classes without class-level description
- Constructors without parameter documentation
- Public methods without method docs
- Static methods and properties

### Undocumented Types
- Interfaces without description
- Type aliases without explanation
- Enums without value descriptions
- Complex generic types

### Undocumented Modules
- Modules without header comment
- Missing README in module directory
- No overview of module purpose

## Gap Classification

### By Visibility
| Visibility | Description |
|------------|-------------|
| **PUBLIC API** | Used by external packages/consumers |
| **INTERNAL API** | Used across modules within project |
| **UTILITY** | Helper functions, shared internally |
| **IMPLEMENTATION** | Private/internal details |

### By Complexity
| Complexity | Description |
|------------|-------------|
| **SIMPLE** | Self-explanatory name, obvious behavior |
| **MODERATE** | Some parameters or behavior needs explaining |
| **COMPLEX** | Multiple params, edge cases, errors, side effects |

## Output Format

Create/update `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_GAPS.md` with:

```markdown
# Documentation Gaps - Loop 00001

## Summary
- **Total Gaps Found:** [count]
- **By Type:** [X] Functions, [Y] Classes, [Z] Types, [W] Modules
- **By Visibility:** [X] Public API, [Y] Internal API, [Z] Utility

## Gap List

### GAP-001: [Export Name]
- **File:** `[path/to/file]`
- **Line:** [XX]
- **Type:** [Function | Class | Interface | Type | Module]
- **Visibility:** [PUBLIC API | INTERNAL API | UTILITY]
- **Complexity:** [SIMPLE | MODERATE | COMPLEX]
- **Current State:** [No docs | Partial docs | Outdated docs]
- **Why It Needs Docs:**
  - [Reason 1 - e.g., "Complex parameters"]
  - [Reason 2 - e.g., "Non-obvious return value"]
- **Signature:**
  ```
  function exportName(param1, param2) -> ReturnType
  ```
- **Documentation Needed:**
  - [ ] Description
  - [ ] Parameters
  - [ ] Return value
  - [ ] Examples
  - [ ] Error handling

### GAP-002: [Export Name]
...

---

## Gaps by Module

| Module | Gap Count | Types |
|--------|-----------|-------|
| `src/api/` | 5 | 3 Functions, 2 Types |
| `src/utils/` | 3 | 3 Functions |
| ... | ... | ... |

## Gaps by Type

### Functions
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `funcName` | `path/to/file` | PUBLIC API | MODERATE |
| ... | ... | ... | ... |

### Classes
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `ClassName` | `path/to/file` | INTERNAL API | COMPLEX |
| ... | ... | ... | ... |

### Types/Interfaces
| Name | File | Visibility | Complexity |
|------|------|------------|------------|
| `TypeName` | `path/to/file` | PUBLIC API | SIMPLE |
| ... | ... | ... | ... |

## Related Exports

Exports that should be documented together:

- **Group A:** `funcA`, `funcB`, `TypeC` - All part of [feature]
- **Group B:** `UtilX`, `UtilY` - Related utilities
```

## Guidelines

- **Be specific**: Include file paths and line numbers
- **Note complexity**: Complex functions need more thorough docs
- **Group related items**: Some exports should be documented together
- **Check visibility**: Public APIs are highest priority
- **Include signatures**: Shows what needs to be documented

## How to Know You're Done

This task is complete when ONE of the following is true:

**Option A - Coverage target already met:**
1. The doc report shows overall coverage of 90% or higher
2. No gaps file is needed—mark the task complete without changes

**Option B - Gaps identified:**
1. The doc report shows coverage below 90%
2. You've examined low-coverage modules and found undocumented exports
3. You've created `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_GAPS.md` with all findings
