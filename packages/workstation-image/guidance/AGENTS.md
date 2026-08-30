# Minion cloud workstation

This workstation is an ephemeral development surface. Keep project source in
the current workspace and avoid storing credentials in generated files.

## Web previews

When a user asks for a webpage, application draft, or local preview:

1. Build the draft in a dedicated project directory.
2. Start the shortest practical private preview. Static sites use:
   `minion-preview start . --port 4173 --ttl 2h --name draft`
3. Framework dev servers use:
   `minion-preview run --port 4173 --ttl 2h --name app -- <dev-command>`
4. Return the exact HTTPS URL printed by the command to the user.
5. Use another port from 3000–9999 for concurrent previews. Never use port
   8000; it is reserved for the workstation GUI.
6. Inspect active previews with `minion-preview status` and stop one early with
   `minion-preview stop <name-or-port>`.

Preview URLs are private exe.dev proxy URLs by default. Do not make them public
unless the user explicitly asks and understands the exposure.
