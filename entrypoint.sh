Set-Content -Path entrypoint.sh -Value @"
#!/usr/bin/env bash
set -o errexit

python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py seed_portfolio

exec gunicorn portfolio_ai.wsgi:application --bind 0.0.0.0:`$PORT --workers 2
"@