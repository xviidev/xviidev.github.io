#!/bin/sh
set -eu
cd "$(dirname "$0")"
case "$(uname -m)" in
  arm64) binary=./xviidev-print-agent-arm64 ;;
  x86_64) binary=./xviidev-print-agent-x64 ;;
  *) printf '%s\n' 'Tidak didukung'; exit 1 ;;
esac
exec "$binary"
