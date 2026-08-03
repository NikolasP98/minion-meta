#!/usr/bin/env bash
set -e
# Creates only the paperclip database.
# Hub uses SQLite (libsql) — no hub database needed here.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE paperclip;
EOSQL
