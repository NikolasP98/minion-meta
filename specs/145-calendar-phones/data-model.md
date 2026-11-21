# Data model: Calendar on phones

No database or API change.

## View (unchanged vocabulary)

| Value in `?view=` | Desktop | Phone |
|---|---|---|
| `day` | Día | Día (default when the address names no view) |
| `week` | week with `prefs.weekDays` columns (default when the address names no view) | 3 días |
| `month` | Mes | Mes with phone cells |
| `agenda` | Lista (scheduling page only) | Lista (both pages) |
| `table`, `board` | layouts | layouts |

Nothing is saved; the last view used is not remembered.

## Phone hint

A cookie `hub_phone=1` (path `/`, one year, `SameSite=Lax`), set or cleared in the browser whenever the phone media query changes. The two calendar page loads read it to choose the default view and the first-render layout. It carries no personal data.
