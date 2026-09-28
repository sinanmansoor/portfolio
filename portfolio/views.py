import json
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from .ai import ask
from .content import EXPERIENCES, PROFILE, PROJECTS, SKILLS

logger = logging.getLogger(__name__)


def _sorted_skills():
    return sorted(SKILLS, key=lambda s: (s["category"], s["name"]))


@require_GET
def home(request):
    return render(
        request,
        "portfolio/index.html",
        {
            "profile": PROFILE,
            "featured_projects": [p for p in PROJECTS if p["featured"]][:4],
            "skills": _sorted_skills(),
            "experiences": EXPERIENCES,
        },
    )


@csrf_exempt
@require_POST
def visit_api(request):
    """
    Emails a visitor notification. Called by app.js after the page loads
    (instead of inside home()) so SMTP never delays rendering, and bots
    that don't run JavaScript don't trigger it.
    """
    if not (settings.EMAIL_HOST_PASSWORD and settings.VISIT_NOTIFY_EMAIL):
        return JsonResponse({"ok": False})

    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    user_ip = forwarded.split(",")[0].strip() or request.META.get("REMOTE_ADDR", "Unknown IP")
    user_agent = request.META.get("HTTP_USER_AGENT", "Unknown")
    referrer = request.META.get("HTTP_REFERER", "Direct")

    send_mail(
        subject="New Visitor on Portfolio!",
        message=(
            "Someone just visited your portfolio homepage.\n"
            f"IP Address: {user_ip}\nUser agent: {user_agent}\nReferrer: {referrer}"
        ),
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[settings.VISIT_NOTIFY_EMAIL],
        fail_silently=True,
    )
    return JsonResponse({"ok": True})


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

    if payload.get("stream", True) is not False:

        def event_stream():
            for token in ask(question, history):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response

    return JsonResponse({"answer": "".join(ask(question, history)), "question": question})
