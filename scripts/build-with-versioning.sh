#!/bin/bash
# Compatibility entry point; all Vite builds now version their output.
set -euo pipefail
cd "$(dirname "$0")/.."
exec npm run build