#!/usr/bin/env bash
set -e
echo "use http://localhost:5789"
lighttpd -D -f lighthttpd.conf
