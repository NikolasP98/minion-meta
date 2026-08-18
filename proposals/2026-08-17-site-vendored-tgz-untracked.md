---
id: 2026-08-17-site-vendored-tgz-untracked
title: Vendored design-tokens tgz untracked — fresh clone bun install fails on dev
status: approved
created: 2026-08-17
updated: 2026-08-18
repos: [minion_site]
tags: [deps, infra]
value: 6
effort: S
source: debt-sweep-2-2026-08-17
---

# Vendored design-tokens tgz untracked — fresh clone bun install fails on dev

## Problem

package.json file: dep points at deps/…concourse-r2.tgz which git status shows untracked (prior tgz deleted). Fresh CI/clone cannot install.

## Definition of done

tgz committed alongside package.json/bun.lock when the redesign lands (owner's call on timing).

## Out of scope

The redesign content itself (owner's active lane).

## Gate note 2026-08-18

PARKED: belongs to the in-flight site redesign (owner lane); commit the tgz with that work.
