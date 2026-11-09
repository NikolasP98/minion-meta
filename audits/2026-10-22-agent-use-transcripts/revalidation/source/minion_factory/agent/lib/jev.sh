#!/usr/bin/env bash
# Shadow decision layer: asks Jev (OpenRouter's `~typesafe/jev-latest`
# decisions endpoint) the same question today's deterministic/model code has
# already answered, and logs both side by side. SHADOW ONLY — no answer this
# file returns may ever change `valid`, an exit code, a run note, or a retry
# decision; every call site wraps this in `if factory_jev_available; then ...
# fi` with fail-open semantics. State is untrusted data (never instructions):
# every `instructions` string built by a caller must say so.
#
# PR-2: two transports. When FACTORY_JEV_PROXY_URL and FACTORY_JEV_CAPABILITY
# are both set (containment-v2 develop/review and every legacy container),
# the call goes to the RUNNER's own POST /jev/decide with the run's scoped,
# revocable capability — the real OpenRouter key never enters a container.
# Otherwise (OPENROUTER_API_KEY set — the host cron's transport), the call
# goes directly to OpenRouter. Both transports write the SAME local result
# file shape, so every caller (agent/rank.sh, scripts/unstick-cron.sh) is
# transport-agnostic.
#
# Contract (mirrors lib/cost.sh's <out>/<tag>-result.json convention):
#   factory_jev_decide <site> <tag> <state-file> <questions-file> [today-json]
#     rc 3  unconfigured (no transport available, or missing curl/jq/files) —
#           no files written
#     rc 4  state over FACTORY_JEV_MAX_STATE_BYTES — no files written
#     rc 2  transport/HTTP/validation failure — writes <out>/jev-<tag>-error.json
#     rc 0  ok — writes <out>/jev-<tag>-result.json, prints its path
#   factory_jev_shadow_log <site> <today-json> <jev-file-or-empty> [run-id]
#     appends one JSONL line to <out>/jev-shadow.jsonl; never fails the
#     caller. This is a LOCAL, per-container/host copy — the proxy transport
#     additionally logs centrally on the runner (jev-proxy.ts); this file is
#     kept for the direct transport and as a per-container debug artifact.
#
# The direct-transport key lives in OPENROUTER_API_KEY (env only); the proxy
# capability lives in FACTORY_JEV_CAPABILITY (env only). Neither is ever in a
# result file or the shadow log, and neither is ever in this container's argv
# or the host process list — but, like GH_TOKEN, either is still visible to
# `docker inspect` on the running container, since that's where the value
# actually lives.

factory_jev_available() {
	command -v curl >/dev/null 2>&1 && command -v jq >/dev/null 2>&1 || return 1
	if [ -n "${FACTORY_JEV_PROXY_URL:-}" ] && [ -n "${FACTORY_JEV_CAPABILITY:-}" ]; then
		return 0
	fi
	[ -n "${OPENROUTER_API_KEY:-}" ]
}

# Appends `--settings <path>` to the named array (nameref) when the PreToolUse
# guard hook is baked into the image and FACTORY_JEV_GUARD hasn't been set to
# `off`. Shared by the harness-stream chokepoint and the direct call sites
# (chat.sh, unstick.sh, reconcile.sh's writer stage) that bypass it, so the
# file path and the enable condition are declared exactly once. Absence of
# the settings file (an older image) is a silent no-op, not an error — the
# hook is additive, never load-bearing.
#
# H8: the path is overridable via FACTORY_GUARD_SETTINGS_FILE so tests can
# point this at a scratch file and exercise the REAL function end to end,
# instead of stubbing it out (a test that stubs the function under test
# proves nothing about that function).
factory_guard_settings_args() { # $1 = name of an array variable to append to
	local -n _fgsa_out=$1
	local settings=${FACTORY_GUARD_SETTINGS_FILE:-/opt/factory-hooks/claude-settings.json}
	if [ -f "$settings" ] && [ "${FACTORY_JEV_GUARD:-shadow}" != off ]; then
		_fgsa_out+=(--settings "$settings")
	fi
}

# Transport-agnostic: `.model` and `.answers` (types/criteria) against
# `.questions`. Works for both the raw OpenRouter response shape and the
# proxy's JevResult body — usage/cost accounting differs per transport (see
# factory_jev_validate_answers below and factory_jev_decide_proxy) and is
# deliberately not this function's job.
factory_jev_validate_answer_shapes() { # $1 = response file, $2 = questions file
	local resp=$1 questions=$2
	jq -e --slurpfile q "$questions" '
		. as $r
		| ($q[0]) as $questions
		| ($r.model | type == "string" and length > 0)
		and ($r.answers | type == "object")
		and (($r.answers | keys | sort) == ($questions | keys | sort))
		and (
			[$questions | to_entries[] | . as $qe
				| ($r.answers[$qe.key]) as $a
				| ($a.type == $qe.value.type)
				and (
					if $qe.value.type == "noul" then ($a.noul | type == "number" and . >= 0 and . <= 1)
					elif $qe.value.type == "choice" then ($a.choice | type == "string" and ($qe.value.criteria | has($a.choice)))
					elif $qe.value.type == "score" then ($a.score | type == "number")
					else false
					end
				)
			] | all
		)
	' "$resp" >/dev/null 2>&1
}

# Direct-transport (raw OpenRouter response) validation: answer shapes plus
# the snake_case usage envelope OpenRouter itself returns.
factory_jev_validate_answers() { # $1 = response file, $2 = questions file
	local resp=$1 questions=$2
	factory_jev_validate_answer_shapes "$resp" "$questions" || return 1
	jq -e '
		(.usage.input_tokens | type == "number" and . >= 0 and . <= 30000)
		and (.usage.output_tokens | type == "number" and . >= 0)
		and (((.usage.cost | type == "number" and . >= 0)) or (.usage.cost | type == "null") or (.usage | has("cost") | not))
	' "$resp" >/dev/null 2>&1
}

# Dispatcher: picks the proxy transport when configured, else the direct one.
# `site` is the calibration-report grouping key (e.g. "rank", "unstick",
# "run-selftest") — distinct from `tag`, which stays the per-call local
# result-file suffix (e.g. "rank-b1-3"). The direct transport never sends
# `site` anywhere (OpenRouter has no such field); it exists purely so the
# proxy body and the central shadow log can group calls the way
# scripts/jev-shadow-report.mjs expects.
factory_jev_decide() { # $1=site $2=tag $3=state-file $4=questions-file $5=today-json (optional)
	# LOW-9: backward-compatible with slice-1's 3-arg call (tag, state-file,
	# questions-file, no leading site) — derive `site` from FACTORY_JEV_SITE if
	# the caller set it, else the tag's own first dash-segment (e.g.
	# "rank-b1-3" -> "rank"). rank.sh/unstick-cron.sh already pass the 4-arg
	# form explicitly and are unaffected (their $# is already >= 4).
	[ $# -ge 4 ] || set -- "${FACTORY_JEV_SITE:-${1%%-*}}" "$@"
	local site=$1 tag=$2 state_file=$3 questions_file=$4 today_json=${5:-}
	local max_bytes=${FACTORY_JEV_MAX_STATE_BYTES:-24000}

	factory_jev_available || return 3
	[ -f "$state_file" ] && [ -f "$questions_file" ] || return 3
	[ "$(wc -c < "$state_file")" -le "$max_bytes" ] || return 4

	if [ -n "${FACTORY_JEV_PROXY_URL:-}" ] && [ -n "${FACTORY_JEV_CAPABILITY:-}" ]; then
		factory_jev_decide_proxy "$site" "$tag" "$state_file" "$questions_file" "$today_json"
		return $?
	fi
	factory_jev_decide_direct "$tag" "$state_file" "$questions_file"
}

# Direct-to-OpenRouter transport (host cron only — see jev.sh's header).
factory_jev_decide_direct() { # $1 = tag, $2 = state-json-file, $3 = questions-json-file
	local tag=$1 state_file=$2 questions_file=$3
	local out=${FACTORY_OUT_DIR:-/out}
	local endpoint=${FACTORY_JEV_ENDPOINT:-https://openrouter.ai/api/alpha/decisions}
	local model=${FACTORY_JEV_MODEL:-~typesafe/jev-latest}
	local timeout=${FACTORY_JEV_TIMEOUT_S:-20}
	local start_ms end_ms ms body_file resp status body cost cost_source

	start_ms=$(date +%s%3N)
	body_file=$(mktemp)
	jq -n --arg model "$model" --slurpfile state "$state_file" --slurpfile questions "$questions_file" \
		'{model:$model,state:$state[0],questions:$questions[0]}' > "$body_file" || { rm -f "$body_file"; return 2; }

	resp=$(curl -sS -m "$timeout" \
		-H "Authorization: Bearer ${OPENROUTER_API_KEY}" \
		-H 'Content-Type: application/json' \
		--data-binary @"$body_file" \
		-w '\n%{http_code}' \
		"$endpoint" 2>/dev/null)
	local curl_rc=$?
	rm -f "$body_file"
	end_ms=$(date +%s%3N)
	ms=$((end_ms - start_ms))

	if [ "$curl_rc" -ne 0 ]; then
		jq -n --arg tag "$tag" --argjson http_status 0 --arg error "curl_exit_${curl_rc}" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	status=${resp##*$'\n'}
	body=${resp%$'\n'*}

	if [ "$status" != 200 ] || ! jq -e . >/dev/null 2>&1 <<<"$body"; then
		jq -n --arg tag "$tag" --arg http_status "$status" --arg error "http_or_parse_failure" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	body_file=$(mktemp)
	printf '%s' "$body" > "$body_file"
	if ! factory_jev_validate_answers "$body_file" "$questions_file"; then
		rm -f "$body_file"
		jq -n --arg tag "$tag" --arg http_status "$status" --arg error "invalid_response" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	cost=$(jq -r '.usage.cost // empty' "$body_file")
	if [ -n "$cost" ] && [ "$cost" != null ]; then
		cost_source=provider-reported
	else
		cost=0
		cost_source=unknown
	fi

	jq -n --arg tag "$tag" --slurpfile resp "$body_file" --argjson costUsd "$cost" --arg costSource "$cost_source" --argjson ms "$ms" \
		'{tag:$tag,model:$resp[0].model,answers:$resp[0].answers,usage:$resp[0].usage,total_cost_usd:$costUsd,cost_source:$costSource,ms:$ms}' \
		> "${out}/jev-${tag}-result.json"
	rm -f "$body_file"
	echo "${out}/jev-${tag}-result.json"
	return 0
}

# Runner decision-proxy transport (PR-2): POST /jev/decide with the run's
# scoped fjc_ capability. The runner already validated `answers` server-side
# (jevDecide in jev.ts uses the exact same type/criteria rules as
# factory_jev_validate_answer_shapes above) before ever answering — this
# function re-checks the shape anyway (cheap, and a version-skew between
# container and runner should never silently write a malformed result file)
# but trusts the runner's own usage/cost accounting outright, translating its
# camelCase JevResult envelope into the SAME snake_case result-file shape the
# direct transport produces, so callers never branch on transport.
factory_jev_decide_proxy() { # $1=site $2=tag $3=state-file $4=questions-file $5=today-json
	local site=$1 tag=$2 state_file=$3 questions_file=$4 today_json=$5
	local out=${FACTORY_OUT_DIR:-/out}
	local timeout=${FACTORY_JEV_PROXY_TIMEOUT_S:-25}
	local start_ms end_ms ms body_file resp status body

	start_ms=$(date +%s%3N)
	body_file=$(mktemp)
	if [ -n "$today_json" ] && jq -e . >/dev/null 2>&1 <<<"$today_json"; then
		jq -n --arg site "$site" --slurpfile state "$state_file" --slurpfile questions "$questions_file" --argjson today "$today_json" \
			'{site:$site,state:$state[0],questions:$questions[0],today:$today}' > "$body_file" || { rm -f "$body_file"; return 2; }
	else
		jq -n --arg site "$site" --slurpfile state "$state_file" --slurpfile questions "$questions_file" \
			'{site:$site,state:$state[0],questions:$questions[0]}' > "$body_file" || { rm -f "$body_file"; return 2; }
	fi

	resp=$(curl -sS -m "$timeout" \
		-H "Authorization: Bearer ${FACTORY_JEV_CAPABILITY}" \
		-H 'Content-Type: application/json' \
		--data-binary @"$body_file" \
		-w '\n%{http_code}' \
		"${FACTORY_JEV_PROXY_URL%/}/jev/decide" 2>/dev/null)
	local curl_rc=$?
	rm -f "$body_file"
	end_ms=$(date +%s%3N)
	ms=$((end_ms - start_ms))

	if [ "$curl_rc" -ne 0 ]; then
		jq -n --arg tag "$tag" --argjson http_status 0 --arg error "curl_exit_${curl_rc}" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	status=${resp##*$'\n'}
	body=${resp%$'\n'*}

	if ! jq -e . >/dev/null 2>&1 <<<"$body"; then
		jq -n --arg tag "$tag" --arg http_status "$status" --arg error "http_or_parse_failure" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi
	# 401 (bad/revoked capability), 429 (run budget), 400 (malformed request)
	# and a 200 body with ok:false are ALL transport failures from this
	# caller's point of view — the proxy always answers 200 for an upstream
	# Jev failure, so only auth/validation/budget ever produce a non-200.
	if [ "$status" != 200 ] || [ "$(jq -r '.ok // false' <<<"$body" 2>/dev/null)" != true ]; then
		jq -n --arg tag "$tag" --arg http_status "$status" --arg error "$(jq -r '.reason // "proxy_not_ok"' <<<"$body" 2>/dev/null)" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	body_file=$(mktemp)
	printf '%s' "$body" > "$body_file"
	if ! factory_jev_validate_answer_shapes "$body_file" "$questions_file"; then
		rm -f "$body_file"
		jq -n --arg tag "$tag" --arg http_status "$status" --arg error "invalid_response" --argjson ms "$ms" \
			'{tag:$tag,http_status:$http_status,error:$error,ms:$ms}' > "${out}/jev-${tag}-error.json" 2>/dev/null
		return 2
	fi

	jq -n --arg tag "$tag" --slurpfile resp "$body_file" --argjson ms "$ms" \
		'{tag:$tag,model:$resp[0].model,answers:$resp[0].answers,
		  usage:{input_tokens:$resp[0].usage.inputTokens,output_tokens:$resp[0].usage.outputTokens},
		  total_cost_usd:($resp[0].costUsd // 0),cost_source:($resp[0].costSource // "unknown"),ms:$ms}' \
		> "${out}/jev-${tag}-result.json"
	rm -f "$body_file"
	echo "${out}/jev-${tag}-result.json"
	return 0
}

# Appends one JSONL line; never fails the caller (a shadow-log write failure
# must not surface as a call-site error). $3 may be a `-result.json` or a
# `-error.json` path (or empty, when factory_jev_decide never ran).
#
# MEDIUM fix: M10 backgrounds several shadow calls concurrently, and a plain
# `>>` is only atomic per underlying write(2) — a JSONL line bigger than one
# stdio buffer (S-D's finding excerpts routinely are, several KB) gets split
# across multiple write()s, so two concurrent appenders can interleave
# mid-line and corrupt the file. Build the whole line first, then serialize
# the actual append behind a bounded flock so the append itself can never
# race another writer's.
factory_jev_shadow_log() { # $1 = site, $2 = today-json-string, $3 = jev-file-or-empty, $4 = run-id (optional)
	local site=$1 today=$2 jev_file=$3 run_id=${4:-}
	local out=${FACTORY_OUT_DIR:-/out}
	local today_file jev_src line
	{
		today_file=$(mktemp)
		printf '%s' "$today" > "$today_file"
		jq -e . "$today_file" >/dev/null 2>&1 || echo 'null' > "$today_file"
		if [ -n "$jev_file" ] && [ -f "$jev_file" ]; then
			jev_src=$jev_file
		else
			jev_src=$(mktemp)
			echo '{"error":"unavailable"}' > "$jev_src"
		fi
		line="$(jq -nc --arg ts "$(date -u +%FT%TZ)" --arg site "$site" --arg runId "$run_id" \
			--slurpfile today "$today_file" --slurpfile jev "$jev_src" \
			'{ts:$ts,site:$site} + (if $runId != "" then {runId:$runId} else {} end) + {today:$today[0],jev:$jev[0]}')"
		rm -f "$today_file"
		[ "$jev_src" = "$jev_file" ] || rm -f "$jev_src"
		( flock -w 5 9 || exit 0
		  printf '%s\n' "$line" >> "${out}/jev-shadow.jsonl"
		) 9>"${out}/jev-shadow.jsonl.lock"
	} 2>/dev/null || true
	return 0
}
