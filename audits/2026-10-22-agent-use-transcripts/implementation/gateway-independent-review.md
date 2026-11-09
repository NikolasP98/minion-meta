# Gateway independent implementation review

Reviewer: root, separate from gateway worker. Scope: Slice10/A10.

## Standards

Pass. Optional typed metadata is additive; channel-owned normalization preserves raw Telegram identifiers rather than stripping routing prefixes. Shared options are imported as types, existing native-command behavior remains uncertified, and product agent routing/authorization is unchanged. The media fixture repair changes only test configuration: correct mocked module and explicit test agent binding. Dependency install rewrote tracked extension node_modules wrappers in the isolated clone; they are excluded from the product patch/commit.

## Spec

Pass for Slice10 producer/carrier scope. Source builder snapshots original primitive values, including whitespace/captions and provider edit revision. Account/raw conversation/provider ID remain separate. Debounce, long-text fragments and albums propagate ordered original units through raw and received hooks. Received metadata deliberately has no single messageId for a certified multi-unit batch; legacy MsgContext routing IDs remain for existing agent logic. Synthetic callback inputs have no certified provenance. This does not implement watcher dedup/receipt Slices11–16. Exact handoff comments at producer/received boundaries point to the matching proposal.

## Executable evidence

Worker red suite had5 expected failures and2 legacy controls. Focused actual bot/context/dispatch-hook fixtures pass7/7. Affected suites pass128 tests across11 files; gateway pnpm check passes with57 existing warnings and zero errors. Legacy media suite initially fails8/10 identically on pinned baseline and current code; corrected test fixture passes10/10 with provider network denied. Logs retain both baseline and repair results. No live channel or model execution is claimed.

Parent directly inspected types, canonical builder, Telegram processor/buffer changes, dispatch metadata and fixture repair; it did not repeat every worker suite. No blocking code/spec finding remains in this slice. Product source identity is pinned by the following file hashes; later edits need reconciliation.

- `src/auto-reply/reply/dispatch-from-config.ts`: `97b4f5fcfe59778f6554b47d92806fc0f5b1502518925bc271af654ad4f9cd3e`
- `src/auto-reply/reply/dispatch-provenance.test.ts`: `1417bc2ac27e7223822bb186a1edde0f4286c6919de4b615b2551b7ce0caae1e`
- `src/auto-reply/templating.ts`: `a73abadd85f48077af9f1de7ffffaa1f75cee74be063766544d0ee5f3a25df1d`
- `src/channels/fire-message-inbound.ts`: `d564a48798933cb57dce421d755436a8daeeb05a3efcbdd731160762a2dd76ce`
- `src/channels/impl/telegram/bot-handlers.ts`: `56c1e315883ac167dd43f9bd49bbe3b7bfd8c9902ac2fc76c7421267fcb55a8e`
- `src/channels/impl/telegram/bot-handlers/media-group-buffer.ts`: `b60421ab7ae985bb13cdbb11581f01169c4b752b7b748d0625f8e926469de374`
- `src/channels/impl/telegram/bot-handlers/text-fragment-buffer.ts`: `d2005911082a4504b45f9479cbe2abc9fc17040da7007d1021dcfd5378cd14fc`
- `src/channels/impl/telegram/bot-message-context.ts`: `c4bd9e6f6d85102a3720ef5f40e3941c61f0f2633bac7a6388a3cac39ceceb80`
- `src/channels/impl/telegram/bot-message.ts`: `268845d1cb9f60b07946938870c9d37089462f4fd839f6feaa8edf6a6f54fca5`
- `src/channels/impl/telegram/bot-native-commands.ts`: `1f40e258f33206dc34900db2869f806b0bc5918ed9050d4d8f53ebcd300a0a6b`
- `src/channels/impl/telegram/bot.media.e2e-harness.ts`: `fc206dcd0a68d0b5b58ace4ce4691c5a24a24af118be6a5ac9f1a2420dd5cf4b`
- `src/channels/impl/telegram/inbound-provenance.test.ts`: `2ffb699b81a9221d0f6692a4d7ad265e7279fd3143f67622ff5a449031a402f4`
- `src/channels/impl/telegram/inbound-provenance.ts`: `f98f42d17517fcc2537a100f3439ad27b213224a29e17cbfa0223e3b6db3eda5`
- `src/plugins/types/hooks.ts`: `93e39bbbaceca9c3ca1baea0ac1c126aa94c4ce695b8027a48f0771be191c265`

## Final-tree reconciliation

The final review additionally inspected the WeakMap mapping normalized channel-post messages back to provider originals. Canonical metadata preserves an absent provider sender rather than inheriting the synthetic sender used by legacy routing. Final actual carrier/hook fixtures pass15/15; media/channel-post suites pass68/68; final-tree full pnpm check passes. All14 final owned file hashes were verified against gateway/source-manifest.json before the scoped commit. This supersedes the earlier7-test snapshot described above.
