#!/bin/bash

# This script waits for clamd to become ready by sending the PING command to
# clamd. Can be configured with the  CLAMSCAN_HOST and CLAMDSCAN_PORT
# environment variables.

# Use environment variables CLAMDSCAN_HOST and CLAMDSCAN_PORT, with fallback
# values
CLAMD_HOST="${CLAMDSCAN_HOST:-127.0.0.1}"
CLAMD_PORT="${CLAMDSCAN_PORT:-3310}"
MAX_ATTEMPTS=30
SLEEP_INTERVAL=5

echo "Waiting for clamd to become ready at $CLAMD_HOST:$CLAMD_PORT..."

for ((i=1; i<=MAX_ATTEMPTS; i++)); do
  # Try to connect to clamd and send the PING command
  RESPONSE=$(echo "PING" | nc -w 2 "$CLAMD_HOST" "$CLAMD_PORT")

  if [[ "$RESPONSE" == "PONG" ]]; then
    echo "clamd is ready!"
    exit 0
  else
    echo "Attempt $i/$MAX_ATTEMPTS: clamd is not ready yet. Retrying in $SLEEP_INTERVAL seconds..."
    sleep "$SLEEP_INTERVAL"
  fi
done

echo "clamd did not become ready within the allotted time."
exit 1