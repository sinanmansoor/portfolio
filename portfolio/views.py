import json
import logging
from urllib.parse import unquote

from django.http import Http404, JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .ai import ask
from .content import (
    ACHIEVEMENTS,
    BRIEF_OPTIONS,
    EXPERIENCES,
    FAQ,
    PROCESS,
    PROFILE,
    PROJECTS,
    SERVICES,
    SKILL_ORBITS,
    SKILLS,
    STATS,
)
from .notify import send_alert

logger = logging.getLogger(__name__)

FEATURED = [p for p in PROJECTS if p["featured"]]


def _sorted_skills():
    return sorted(SKILLS, key=lambda s: (s["category"], s["name"]))


def _base_context(**extra):
    """Context every page needs: profile, and the data app.js reads."""
    return {
        "profile": PROFILE,
        "stats": STATS,
        "nav_projects": FEATURED,
        "site_data": {
            "profile": PROFILE,
            "projects": PROJECTS,
            "skills": SKILLS,
            "experiences": EXPERIENCES,
            "services": [s["title"] for s in SERVICES],
        },
        **extra,
    }


@require_GET
def home(request):
    return render(
        request,
        "portfolio/index.html",
        _base_context(
            page="home",
            projects=FEATURED,
            skills=_sorted_skills(),
            skill_orbits=SKILL_ORBITS,
            experiences=EXPERIENCES,
            services=SERVICES[:3],
        ),
    )


@require_GET
def project_detail(request, slug):
    index = next((i for i, p in enumerate(FEATURED) if p["slug"] == slug), None)
    if index is None:
        raise Http404("Project not found")
    return render(
        request,
        "portfolio/project.html",
        _base_context(
            page="project",
            project=FEATURED[index],
            number=index + 1,
            next_project=FEATURED[(index + 1) % len(FEATURED)],
        ),
    )


@require_GET
def hire(request):
    return render(
        request,
        "portfolio/hire.html",
        _base_context(page="hire", services=SERVICES, process=PROCESS, brief_options=BRIEF_OPTIONS, faq=FAQ),
    )


@require_GET
def resume(request):
    groups = {}
    for skill in _sorted_skills():
        groups.setdefault(skill["category"], []).append(skill["name"])
    labels = {"AI": "AI & LLMs", "Data": "ML & Data", "Backend": "Backend", "Frontend": "Frontend", "Tools": "Tools"}
    return render(
        request,
        "portfolio/resume.html",
        _base_context(
            page="resume",
            work=[e for e in EXPERIENCES if e["kind"] in {"Experience", "Residency"}],
            education=[e for e in EXPERIENCES if e["kind"] in {"Education", "Certification"}],
            projects=FEATURED,
            skill_groups=[(labels.get(cat, cat), names) for cat, names in groups.items()],
            achievements=ACHIEVEMENTS,
        ),
    )


def not_found(request, exception=None):
    return render(request, "portfolio/404.html", _base_context(page="404"), status=404)


def _describe_device(user_agent: str) -> str:
    ua = user_agent.lower()
    device = "Mobile" if any(k in ua for k in ("mobile", "android", "iphone")) else "Desktop"
    for name, key in (("Edge", "edg/"), ("Chrome", "chrome/"), ("Firefox", "firefox/"), ("Safari", "safari/")):
        if key in ua:
            return f"{device} · {name}"
    return device


@csrf_exempt
@require_POST
def visit_api(request):
    """
    Sends a visitor alert (ntfy / Telegram / email — see portfolio/notify.py).
    Called by app.js after the page loads, so it never delays rendering and
    bots that don't run JavaScript don't trigger it.
    """
    meta = request.META
    forwarded = meta.get("HTTP_X_FORWARDED_FOR", "")
    user_ip = forwarded.split(",")[0].strip() or meta.get("REMOTE_ADDR", "Unknown IP")
    user_agent = meta.get("HTTP_USER_AGENT", "Unknown")

    # Vercel adds geolocation headers for free (city is URL-encoded).
    city = unquote(meta.get("HTTP_X_VERCEL_IP_CITY", ""))
    region = meta.get("HTTP_X_VERCEL_IP_COUNTRY_REGION", "")
    country = meta.get("HTTP_X_VERCEL_IP_COUNTRY", "")
    location = ", ".join(part for part in (city, region, country) if part) or "Unknown location"

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        payload = {}
    referrer = str(payload.get("referrer") or "").strip()[:300] if isinstance(payload, dict) else ""

    body = (
        f"Location: {location}\n"
        f"Device: {_describe_device(user_agent)}\n"
        f"Came from: {referrer or 'Direct / unknown'}\n"
        f"IP: {user_ip}"
    )
    sent = send_alert(f"Portfolio visitor from {location}", body, click_url=request.build_absolute_uri("/"))
    return JsonResponse({"ok": bool(sent)})


@require_GET
def profile_api(request):
    return JsonResponse(PROFILE)


@require_GET
def skills_api(request):
    return JsonResponse(_sorted_skills(), safe=False)


@require_GET
def projects_api(request):
    projects = sorted(PROJECTS, key=lambda p: not p["featured"])
    return JsonResponse(projects, safe=False)


@require_GET
def experience_api(request):
    return JsonResponse(EXPERIENCES, safe=False)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def chat_api(request):
    """
    Chat endpoint. POST {"question": str, "history": [{"role", "content"}], "stream": bool}.
    Streams Server-Sent Events by default; returns JSON when stream is false.
    """
    if request.method == "GET":
        return JsonResponse(
            {"answer": "I am Sinan's personal assistant. Ask me anything about his skills, projects, experience, or background!"}
        )

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        payload = {}
    if not isinstance(payload, dict):
        payload = {}

    question = str(payload.get("question") or "").strip()
    if not question:
        return JsonResponse(
            {"answer": "Please ask a question about Sinan's background, skills, or projects."},
            status=400,
        )

    history = payload.get("history")
    mode = "jd" if payload.get("mode") == "jd" else "chat"

    if payload.get("stream", True) is not False:

        def event_stream():
            for token in ask(question, history, mode):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    return JsonResponse({"answer": "".join(ask(question, history, mode)), "question": question})
