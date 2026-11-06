# UI and persistence contracts

DataView accepts a readonly nonempty catalog of allowed view kinds. Runtime empty catalogs fail explicitly. Fallback is first allowed view. DataTable activation callback carries the actual displayed logical row and source gesture; selection remains separate. Interactive descendants never activate a row. Explicit props override presets including explicit false. Read tables retain native table semantics; editing grid requires coherent active cell/focus semantics.

EditableGrid receives an accessible item label, captures owner on save, exposes keyboard move/resize/hide/reset and announces changes. Compact mode uses actual container width; width resize is unavailable with explanation while preserving desktop widths. DOM and visual order agree.

FormField helper and error each have IDs and both appear in aria-describedby when present. ErrorSummary contains linked field errors and moves focus through normal controls. Destructive ConfirmDialog identifies entity, disables duplicate submissions, keeps failure visible, restores trigger focus.

Preference API validates structural versioned layout shape and limits, reuses existing auth/org gates, and returns failure honestly. Stock/item and event-type PATCH admit expected version, atomically reject mismatch, and return authoritative version. Existing callers must pass the version from their record; no new unconditional overwrite path is introduced.

Placement: global navigation/scope in app shell; title/dominant action in page header; query/filter/sort/view switch in view toolbar; object actions on object/inspector; consequential commit in form footer; shared defaults behind explicit command. One owner for scrolling per region and one owner for each piece of state.

The spec review-amendments section fixes the complete270pair matrix, enumerated target scope, both FormField APIs, required PATCH versions, native PostgreSQL CAS proof, caller migration, and unknown-reconciliation behavior. Those contracts are normative for these APIs.
