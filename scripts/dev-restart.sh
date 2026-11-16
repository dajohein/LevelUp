#!/bin/bash
set -e
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
"$SCRIPT_DIR/dev-stop.sh"
exec "$SCRIPT_DIR/dev-start.sh" "$@"
