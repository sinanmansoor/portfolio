import os


def asset_version(request):
    """
    Cache-busting token for CSS/JS URLs. Static files are served from Vercel's
    CDN with a one-year cache, so every deploy needs new URLs.
    """
    return {"asset_version": (os.environ.get("VERCEL_GIT_COMMIT_SHA") or os.environ.get("VERCEL_DEPLOYMENT_ID") or "dev")[:10]}
