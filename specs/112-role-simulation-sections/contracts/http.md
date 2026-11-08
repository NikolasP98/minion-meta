# Interfaces

Canonical app layout supplies simulation active/invalid/eligible, role key/label, generation and selectable org role catalog; no mount-time auth fetch.

POST /api/me/role-simulation: strict {roleKey,generation,returnTo}; DELETE: {generation,returnTo}. Server derives actor/session/org. Return {location,generation}, private/no-store. Start unavailable while active; authenticated Finish remains available despite denied module access. 400 invalid input, 401 unauthenticated, 403 unauthorized, 409 stale generation. Browser writes carry X-Role-Simulation-Generation. Already-admitted requests keep their captured authority and are not falsely cancelled; stale new writes are rejected.

GET /api/nav/access?target=<stable key> supplies current org/target/catalog/default/effective/explicit state and revision. PUT strict {target,roleKey,revision,mode,caps?,ifOwner?,fieldLevel?}; users:manage independent of settings:manage. Live target/role checks, conflict check, persistence and audit share one scoped transaction. Owner immutable; inherit deletes, deny stores false. Success invalidates shared permissions/nav; 409 retains draft.

UI: inactive avatar item opens single-screen choose/Apply tray with short warning; active item is highlighted Finish. Full viewport frame is pointer-transparent and layout-neutral. No other simulation exit control. Shared access editor uses reviewed Apply and visible/keyboard/context entry points.

## Section policy wire format

Target is one canonical string: `crm`, `crm.customers` (registered module/subresource), `section:abc123`, `page:abc123`, or `page:/crm/customers` (registered static native screen). Server revalidates live existence inside the same locked write transaction; labels are never identifiers.

GET returns `{target,label,kind,orgName,roles:[{key,name,protected,defaults,effective,explicit,revision}]}`. Each action set is `{view,create,edit,delete,export,manage}` booleans. Defaults preview removing only this target override while retaining current inherited rules; inheritedIfOwner/inheritedFieldLevel expose the resulting record and field scope; effective includes overrides/inheritance; explicit is nullable `{caps,ifOwner,fieldLevel}`. Revision is SHA-256 of canonical JSON `[orgId,target,roleKey,liveTargetDefinition,liveRoleDefinition,storedOverrideOrNull,parentOverrideOrNull]`; object order is fixed by serializer. A missing override still has a revision.

PUT example: `{target:"section:abc123",roleKey:"viewer",revision:"<hash>",mode:"deny"}`. Modes are `inherit` (delete row), `deny` (all six actions false), `override` (complete boolean caps required). Section/page targets accept view-only caps, no scope/field fields. Module/subresource writes normalize all actions off when view=false. Omitted ifOwner/fieldLevel preserve stored values; explicit false/zero clear them. ifOwner is accepted only for owner-scopable modules, fieldLevel is integer 0..9 on field-level modules. Owner role is immutable via all HTTP writers. Unknown fields/targets/roles reject before mutation.

Successful PUT and legacy POST/DELETE return `{ok:true,revision,location?}`; invalidation failures after durable commit are reported as committed success with refresh-required state, never as rejected save. 409 retains editor draft and requires reload/review of current state. Existing Settings matrix carries revisions from its canonical server loader and updates the committed revision before any fallible refresh.
