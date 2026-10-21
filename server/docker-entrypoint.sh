#!/bin/sh
set -e

echo "Applying database schema migrations with Prisma..."
until npx prisma db push --accept-data-loss; do
  echo "Database is unavailable or starting up - retrying in 2 seconds..."
  sleep 2
done

echo "Database ready and schema synchronized!"

exec "$@"
