# Production analytics refresh — September11

Read-only PostHog connector queries confirmed project129899 (Default project), timezoneUTC, with observed pageview hosts hub.minion-ai.org and two localhost development hosts. Queries below filter the production Hub host/URL. No insights, issues, flags, alerts, captures or other project configuration were changed.

The relative-7d query resolved to September4 00:00UTC through September11 23:59:59UTC; September11 is partial at execution. Test-account exclusion was explicitly false, so this is recorded traffic, not a certified customer cohort. Device totals use aggregated_value (the bar response's count field is0 and is not the total):201 Desktop pageviews and30 Mobile pageviews. Exact query/response aggregates are in POSTHOG-DEVICES-2026-09-11.json. These are pageviews, not unique users or devices. [PostHog total-value chart semantics](https://posthog.com/docs/product-analytics/trends/charts#total-value).

Exception grouping query: statusall, URL contains https://hub.minion-ai.org, occurrence descending, limit10; response9 groups, hasMorefalse,38 occurrences total. Each group reported one user, but identities were not fetched or deduplicated; do not sum those user counts or infer all groups belong to the same person.

| Group | Occurrences | Issue |
|---|---:|---|
| Object captured with error/status/type |13|[Issue](https://us.posthog.com/project/129899/error_tracking/019f59e9-ad42-75d3-bfd5-dc1e0a02251b)|
| Script error |9|[Issue](https://us.posthog.com/project/129899/error_tracking/019e7cd1-ea6c-7982-aa8c-47133807adc1)|
| Not found /en |4|[Issue](https://us.posthog.com/project/129899/error_tracking/01a07012-d740-7b42-8bc4-20db79857dac)|
| ResizeObserver undelivered notifications |4|[Issue](https://us.posthog.com/project/129899/error_tracking/019d034e-fce8-7e43-a705-b1da1a4398a4)|
| Object captured with error/type |4|[Issue](https://us.posthog.com/project/129899/error_tracking/01a08237-6f5b-70c1-b1d7-0d9c9c246525)|
| Object captured with error/status/type, another release group |1|[Issue](https://us.posthog.com/project/129899/error_tracking/01a02c93-d9b1-7283-b554-87451506daf9)|
| Object captured with error/status/type, another release group |1|[Issue](https://us.posthog.com/project/129899/error_tracking/01a05946-1dbe-73f1-b245-19bfc77c9186)|
| NetworkError fetching resource |1|[Issue](https://us.posthog.com/project/129899/error_tracking/019f534e-2022-73a3-b4cd-e03bd0f59b70)|
| Not found / |1|[Issue](https://us.posthog.com/project/129899/error_tracking/01a079a4-dd99-7da3-b13f-6d5c38db524f)|

These observations justify follow-up on locale routing and error classification/source maps. They do not identify the offending source revision or prove the new local UI candidates repair those production groups. No issues were suppressed merely because a browser warning can be benign. Selected source-map/error detail and actual source reproduction belong to16-02/20-02 before remediation claims.

Schema discovery listed AI-generation/trace/evaluation events as not seen in the last30 days. This is an observability coverage finding, not evidence that agents did not execute. Agent-layer replication and governance remain subject to native source/transport tests and explicit telemetry adoption.

## Compact issue follow-up

Read-only details for the highest-volume group confirm 13 occurrences across 2 sessions and 1 counted user, last seen September 9 at 02:13:31 UTC. Its top in-app frame is minified function A in /_app/immutable/entry/app.D1nBKhRc.js, line 2. No release or original source mapping was returned. The generic captured-object description alone does not establish the originating source defect.

The /en not-found group reports 4 occurrences across 3 sessions and 1 counted user, last seen September 8 at 07:34:32 UTC. Its top frame is also minified. These compact issue-detail calls do not accept the host filter used by the earlier issue-list query; keep that distinction. No replay, user identity, payload body, issue resolution or application mutation was requested. Locale navigation reproduction and source-map attribution remain open before selecting a repair.
