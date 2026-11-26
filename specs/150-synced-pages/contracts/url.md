# Contract — page link (moved to S2)

S1 keeps page values in memory (`localValues`). S2 adds `urlValues`: `?f.period=last_30d` · `?f.service=Botox` · `?f.status=a&f.status=b` · `?f.service=` (cleared); `replaceState` from `$app/navigation`; values parsed against the publisher's column type; invalid ⇒ empty + notice.
