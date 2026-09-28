"""
Django settings for portfolio_ai project.

The site has no database: page content lives in portfolio/content.py and the
chatbot's knowledge in portfolio/data/. This keeps cold starts fast on
serverless hosts like Vercel.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(',') if item.strip()]


SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-local-dev-only-change-me')

DEBUG = os.environ.get('DEBUG', 'False').lower() in {'1', 'true', 'yes', 'on'}

ALLOWED_HOSTS = _env_list('ALLOWED_HOSTS', 'localhost,127.0.0.1,.vercel.app')

CSRF_TRUSTED_ORIGINS = [
    origin if origin.startswith(('http://', 'https://')) else f'https://{origin}'
    for origin in _env_list(
        'CSRF_TRUSTED_ORIGINS',
        'https://*.vercel.app,http://localhost:8000,http://127.0.0.1:8000',
    )
]


INSTALLED_APPS = [
    'whitenoise.runserver_nostatic',
    'django.contrib.staticfiles',
    'portfolio',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'portfolio_ai.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'portfolio.context_processors.asset_version',
            ],
        },
    },
]

WSGI_APPLICATION = 'portfolio_ai.wsgi.application'

# No database — all content is static.
DATABASES = {}


LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files. On Vercel they are served directly by the CDN (see
# vercel.json); WhiteNoise serves them locally and as a fallback, straight
# from the source folders (USE_FINDERS) so no collectstatic step is needed.
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
WHITENOISE_USE_FINDERS = True
WHITENOISE_MAX_AGE = 60 * 60 * 24

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

