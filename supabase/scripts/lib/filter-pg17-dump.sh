#!/usr/bin/env bash
# Sdílené filtrování pg_dump z PG 17 pro import do PG 15.
filter_pg17_dump_for_pg15() {
  sed \
    -e '/^\\restrict/d' \
    -e '/^\\unrestrict/d' \
    -e '/^SET transaction_timeout/d' \
    -e '/^ALTER TABLE.*DISABLE TRIGGER/d' \
    -e '/^ALTER TABLE.*ENABLE TRIGGER/d'
}
