#!/usr/bin/env sh
set -e

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_portfolio

PORT=${PORT:-8000}
exec gunicorn portfolio_ai.wsgi:application --bind 0.0.0.0:$PORT --workers 2
