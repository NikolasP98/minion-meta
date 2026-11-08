# FigCraft design source of truth

`design/figcraft/` holds the canonical UI of the Minion products as FigCraft files. The folder lives inside the
meta repo (git) **and** inside the Synology Drive two-way sync task for `~/Documents/CODE/MINION/`, so the files
are versioned and mirrored without any extra setup.

| File | What |
|---|---|
| `minion-hub.master.figcraft` | **Master** — the canonical hub UI: one page per module (view frames in row 1, per-screen states in row 2, FACES production previews with dummy data in row 3), a `Components` page (one component set per primitive, variants = states), a `Foundations` page (every design token as a variable, text + effect styles). Prototype links are wired on every frame. |
| `minion-site.master.figcraft` | **Master** — the public site landing. |
| `pipeline/` | The capture → build → wire scripts that generated the masters (see `pipeline/README.md`). |

## The rule: UI changes are demoed in FigCraft first

Every UI change (hub or site) is validated as a FigCraft demo **before** it is implemented:

1. **Proposal file.** Create `specs/<spec-id>/<spec-id>.figcraft` from the master with the proposal tool — it copies
   the relevant views, screens and components out of the master, keeping page names and metadata:
   ```bash
   python3 design/figcraft/pipeline/fc-proposal.py design/figcraft/minion-hub.master.figcraft \
     specs/<spec-id>/<spec-id>.figcraft "CRM / crm/customers*" "Components / Button"
   ```
   Frames copied this way carry `pluginData.role = "as-is"`. Duplicate the ones you change and name the copies
   `<frame> · to-be`; for brand-new screens only the to-be frame exists. As-is frames are required whenever the
   change touches an existing view or component.
2. **Spec links the demo.** A spec that ships more than one file becomes a directory: `specs/<spec-id>/<spec-id>.md`
   plus its `.figcraft` (and anything else). Single-file specs stay `specs/<spec-id>.md` with no directory.
   `scripts/spec-index.mjs` indexes both shapes. The spec body links the demo under a `## FigCraft demo` heading.
3. **Review on the demo.** Reviewers open the proposal file (FigCraft → Present shows the to-be flow) and leave the
   verdict on the spec as usual.
4. **Promote on approval + implementation.** Once the change is merged, fold the to-be frames into the master and
   delete the proposal file:
   ```bash
   python3 design/figcraft/pipeline/fc-promote.py specs/<spec-id>/<spec-id>.figcraft design/figcraft/minion-hub.master.figcraft
   ```
   Rename `… · to-be` frames to the plain frame name before promoting so they replace the as-is frame in place
   (same page, same position). New frames are appended to the page with the same name.
5. **Keep the master honest.** After a release that changed shipped UI, re-run the capture pipeline for the touched
   module (`pipeline/README.md`) so the master reflects the real app, not the proposal.

Masters are never edited for a proposal; proposals are never committed anywhere but their spec directory.

## Opening and presenting

`figcraft design/figcraft/minion-hub.master.figcraft` (GUI) or `figcraft-cli mcp` (headless). In the GUI, Shift+E
switches to Prototype, Present starts the "MINION hub" flow at Home. Variables → mode switches the theme for the
whole file (20 theme modes from `packages/design-tokens/tokens.css`).
