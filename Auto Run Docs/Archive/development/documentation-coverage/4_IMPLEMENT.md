# Documentation Implementation - Write the Docs

## Context
- **Playbook:** Documentation
- **Agent:** feature-documentation
- **Project:** /home/adam/Dev/drawfinity_worktree/feature-documentation
- **Auto Run Folder:** /home/adam/Dev/drawfinity/Auto Run Docs
- **Loop:** 00004

## Objective

Write documentation for `PENDING` gaps from the evaluation phase. Create high-quality documentation that follows project conventions and helps users understand the code.

## Instructions

1. **Read the plan** from `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_PLAN.md`
2. **Find all `PENDING` items** (not `IMPLEMENTED`, `WON'T DO`, or `PENDING - NEEDS CONTEXT`)
3. **Write documentation** for each PENDING item
4. **Update status** to `IMPLEMENTED` in the plan file
5. **Log changes** to `/home/adam/Dev/drawfinity/Auto Run Docs/DOC_LOG_feature-documentation_2026-03-21.md`

## Implementation Checklist

- [x] **Write documentation (or skip if none)**: Read /home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_PLAN.md. If the file doesn't exist OR contains no items with status exactly `PENDING`, mark this task complete without changes. Otherwise, write documentation for ONE `PENDING` item with PUBLIC/INTERNAL visibility and HIGH/CRITICAL importance. Follow project documentation conventions. Update status to `IMPLEMENTED` in the plan. Log to DOC_LOG. Only document ONE export per task. *(Loop 00012: Documented DOC-028 StrokeRenderer.setCameraMatrix method in renderer/StrokeRenderer.ts)* *(Loop 00013: Documented DOC-029 SpatialIndex.rebuild method in renderer/SpatialIndex.ts)* *(Loop 00014: Documented DOC-030 SpatialIndex.rebuildAll method in renderer/SpatialIndex.ts)* *(Loop 00015: Documented DOC-031 DotGridRenderer.getEffectiveSpacing method in renderer/DotGridRenderer.ts)* *(Loop 00016: Documented DOC-032 LineGridRenderer.getEffectiveSpacing method in renderer/LineGridRenderer.ts)* *(Loop 00017: Documented DOC-033 generateRectangleVertices function in renderer/ShapeMesh.ts)* *(Loop 00018: Documented DOC-034 generateEllipseVertices function in renderer/ShapeMesh.ts)* *(Loop 00019: Documented DOC-035 generatePolygonVertices function in renderer/ShapeMesh.ts)* *(Loop 00020: Documented DOC-036 generateStarVertices function in renderer/ShapeMesh.ts)* *(Loop 00021: Documented DOC-037 CheatSheet class in ui/CheatSheet.ts)* *(Loop 00022: Documented DOC-038 CheatSheet.show method in ui/CheatSheet.ts)* *(Loop 00023: Documented DOC-039 CheatSheet.hide method in ui/CheatSheet.ts)* *(Loop 00024: Documented DOC-040 CheatSheet.toggle method in ui/CheatSheet.ts)* *(Loop 00025: Documented DOC-041 CheatSheet.isVisible method in ui/CheatSheet.ts)* *(Loop 00026: Documented DOC-042 CheatSheet.destroy method in ui/CheatSheet.ts)* *(Loop 00027: Documented DOC-043 ViewName type in ui/ViewManager.ts)* *(Loop 00028: Documented DOC-044 ViewManagerDeps interface in ui/ViewManager.ts)* *(Loop 00029: Documented DOC-045 ViewManager class in ui/ViewManager.ts)* *(Loop 00030: Documented DOC-046 ViewManager.showHome method in ui/ViewManager.ts)* *(Loop 00031: Documented DOC-047 ViewManager.showCanvas method in ui/ViewManager.ts)* *(Loop 00032: Documented DOC-048 ViewManager.getCurrentView method in ui/ViewManager.ts)* *(Loop 00033: Documented DOC-049 ViewManager.destroy method in ui/ViewManager.ts)* *(Loop 00034: Documented DOC-050 ToolbarCallbacks interface in ui/Toolbar.ts)* *(Loop 00035: Documented DOC-051 Toolbar class in ui/Toolbar.ts)* *(Loop 00036: Documented DOC-052 loadProfile function in user/UserStore.ts)* *(Loop 00037: Documented DOC-053 saveProfile function in user/UserStore.ts)* *(Loop 00038: Documented DOC-054 onProfileChange function in user/UserStore.ts — FINAL PENDING item)*

## Documentation Structure

Use the documentation format already established in the project. All doc comments should include:

### For Functions/Methods
```
[Brief description - what does this function do?]

Parameters:
  - paramName: [type] - Description of what this parameter is for
  - optionalParam: [type] - Description (optional, default: X)

Returns:
  [type] - Description of what is returned and when

Errors/Exceptions:
  - [ErrorType]: When [condition that causes this error]

Example:
  [Show typical usage]
```

### For Classes
```
[Brief description - what is this class for?]

[Longer description explaining when to use this class,
its responsibilities, and lifecycle if relevant]

Constructor:
  - param1: [type] - Description
  - param2: [type] - Description

Example:
  [Show how to instantiate and use]
```

### For Types/Interfaces
```
[Brief description - what does this type represent?]

[When to use this type and any constraints]

Properties:
  - propertyName: [type] - Description
  - optionalProp: [type] - Description (optional)
```

## Documentation Quality Checklist

Before marking as IMPLEMENTED:

- [ ] **Description is clear**: Explains WHAT, not HOW
- [ ] **All parameters documented**: With types and descriptions
- [ ] **Return value documented**: What it returns and when
- [ ] **Errors documented**: What exceptions can be thrown
- [ ] **Examples included**: For complex functions
- [ ] **Matches project style**: Consistent with existing docs
- [ ] **No implementation details**: Focus on interface, not internals
- [ ] **Grammatically correct**: Clear, professional language

## What to Include

### Always Include
- **Description**: What does it do? (1-2 sentences)
- **Parameters**: Type, name, description for each
- **Returns**: What comes back, including edge cases

### Include When Relevant
- **Examples**: For complex or non-obvious usage
- **Throws/Raises**: Error conditions
- **See Also**: Related functions or types
- **Deprecated**: If being phased out
- **Since**: Version when added (if project tracks this)

### Avoid
- Implementation details that may change
- Obvious information ("param x: the x value")
- Duplicating the function name in description
- Overly long descriptions
- Outdated examples

## Update Plan Status

After documenting each export, update `LOOP_00004_PLAN.md`:

```markdown
### DOC-001: [Export Name]
- **Status:** `IMPLEMENTED`  ← Changed from PENDING
- **Implemented In:** Loop 00001
- **Documentation Added:**
  - [x] Description
  - [x] Parameters (3)
  - [x] Returns
  - [x] Example
```

## Log Format

Append to `/home/adam/Dev/drawfinity/Auto Run Docs/DOC_LOG_feature-documentation_2026-03-21.md`:

```markdown
## Loop 00001 - [Timestamp]

### Documentation Added

#### DOC-001: [Export Name]
- **Status:** IMPLEMENTED
- **File:** `[path/to/file]`
- **Type:** [Function | Class | Interface]
- **Documentation Summary:**
  - Description: [brief summary of what was written]
  - Parameters: [count] documented
  - Examples: [Yes/No]
- **Coverage Impact:** +[X.X%]

---
```

## Guidelines

- **One export at a time**: Focus on quality over quantity
- **Read the code first**: Understand before documenting
- **Match existing style**: Be consistent with project conventions
- **Think like a user**: What would someone need to know?
- **Examples matter**: Show, don't just tell

## How to Know You're Done

This task is complete when ONE of the following is true:

**Option A - Documented an export:**
1. You've written documentation for exactly ONE export from `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_PLAN.md`
2. You've appended the change details to `/home/adam/Dev/drawfinity/Auto Run Docs/DOC_LOG_feature-documentation_2026-03-21.md`
3. You've updated the item status in `/home/adam/Dev/drawfinity/Auto Run Docs/LOOP_00004_PLAN.md` to `IMPLEMENTED`

**Option B - No PENDING items available:**
1. `LOOP_00004_PLAN.md` doesn't exist, OR
2. It contains no items with status exactly `PENDING`
3. Mark this task complete without making changes

This graceful handling allows the pipeline to continue when a loop iteration produces no actionable documentation gaps.

## When No Documentation Is Available

If there are no items with status exactly `PENDING` in the plan file, append to `/home/adam/Dev/drawfinity/Auto Run Docs/DOC_LOG_feature-documentation_2026-03-21.md`:

```markdown
---

## [YYYY-MM-DD HH:MM] - Loop 00001 Complete

**Agent:** feature-documentation
**Project:** feature-documentation
**Loop:** 00001
**Status:** No PENDING documentation gaps available

**Summary:**
- Items IMPLEMENTED: [count]
- Items WON'T DO: [count]
- Items PENDING - NEEDS CONTEXT: [count]

**Recommendation:** [Either "All automatable documentation complete" or "Remaining items need manual review"]
```

This signals to the pipeline that this loop iteration is complete.
