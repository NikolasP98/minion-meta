# Scoped exact native assertion counts

The pinned report validator enforces a minimum and presence of every unique required full name. It intentionally accepts extra passing assertions in an admitted file. F7 owns the following additive harness change before a new FACES suite claims an exact count; unrelated legacy admissions retain their current behavior.

## Manifest and report delta

Modify scripts/qc/native-postgres-manifest.ts NativePostgresAdmission with optional `exactAssertions?: boolean`. Omitted or false preserves minimum-count semantics. The initial F7 audit admission sets exactAssertions:true with minimumAssertions=8 and its eight existing requiredBehaviors. No future F3/F1/F2 file is registered before that owning slice creates it. Those slices set true on their own admission when claiming an exact count; F3's thirteen-name source suite uses true, and later F5 cases extend its existing behavior without creating a fourteenth name.

Preserve the existing ownership validator's requiredBehaviors.length===minimumAssertions and unique-name checks, plus its exact file ownership/discovery checks. Its test helper input type gains the optional boolean; no existing row is changed to exact mode implicitly. Existing lane count remains nine.

Modify scripts/qc/native-postgres-report.ts assertNativePostgresReport in its existing per-admission loop. Keep every current success, skip, todo, failure, runtime error, file-set, required-name, duplicate-name and aggregate-total check. Additionally, only when exactAssertions===true, require assertionResults.length===requiredBehaviors.length; mismatch throws credential-free `Native fixture assertion count mismatch: <file>`. Existing required-name inclusion and unique-name checks make this the exact selected name set. No filtered-run, missing-file, renamed-behavior or skip bypass is introduced.

The ordinary scripts/qc/native-postgres-manifest.test.ts and native-postgres-report.test.ts are mandatory Modify actions. Test a passing exact set; a new extra passing named assertion rejected in exact mode; missing/duplicate/unnamed/failed/skipped cases rejected; and the same extra passing behavior accepted when the flag is omitted or false. Retain the pinned legacy-additive regression. Manifest tests retain one-owner discovery and required-name/minimum consistency. Use real functions under test, not a duplicated checker.

## Ownership and qualification

F7 implements this shared optional type/report behavior and its four exact source/test file actions once. F3 and other dependent slices only register their own concrete files/names/flag and exercise the shared tests; they do not fork another report validator. The existing focused F7 command already includes both validator test files. Each candidate still runs the whole admitted native lane and full JSON report guard after implementation, not a filtered subset represented as a full lane.

This is a selected future implementation contract, not a claim that the pinned validator already rejects extra passing behaviors. No source/config/test was changed or executed during document authoring. Owner spec approval and normal implementation gates remain pending.

## Resolved implementation decisions (R6)

- IR-10: the audit admission is registered in T003 (the ownership validator requires every `*.sql.integration.test.ts` to be admitted) with the eight named tests present. Until T022 each body throws `TODO(handoff)`, so the qa-native lane is expected RED on the feature branch. No intermediate PR claims a qualified lane; the lane must be green before T023.
