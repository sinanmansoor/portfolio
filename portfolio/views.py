import json

from django.http import JsonResponse, StreamingHttpResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings
from .models import Experience, KnowledgeEntry, Profile, Project, Skill


def home(request):
    # 1. Grab the user's IP address (optional, but helpful)
    user_ip = request.META.get("REMOTE_ADDR", "Unknown IP")

    # 2. Send the notification email
    send_mail(
        subject="New Visitor on Portfolio!",
        message=f"Someone just visited your portfolio homepage.\nIP Address: {user_ip}",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[
            "muhammedsinanmansoor@gmail.com"
        ],  # CHANGE THIS to the email where you want to receive alerts
        fail_silently=True,  # Crucial: prevents the page from crashing if email fails
    )

    # 3. Your existing portfolio data logic
    profile = Profile.objects.first()
    featured_projects = Project.objects.filter(featured=True).order_by("-created_at")[
        :4
    ]
    skills = Skill.objects.all().order_by("category", "name")
    experiences = Experience.objects.all().order_by("-id")

    return render(
        request,
        "portfolio/index.html",
        {
            "profile": profile,
            "featured_projects": featured_projects,
            "skills": skills,
            "experiences": experiences,
        },
    )


@api_view(["GET"])
def profile_api(request):
    profile = Profile.objects.first()
    if not profile:
        return Response({})
    return Response(
        {
            "name": profile.name,
            "headline": profile.headline,
            "summary": profile.summary,
            "location": profile.location,
            "email": profile.email,
            "github_url": profile.github_url,
            "linkedin_url": profile.linkedin_url,
            "resume_url": profile.resume_url,
            "availability": profile.availability,
            "work_style": profile.work_style,
            "tags": profile.tags,
        }
    )


@api_view(["GET"])
def skills_api(request):
    skills = Skill.objects.all().order_by("category", "name")
    return Response(
        [
            {
                "id": skill.id,
                "category": skill.category,
                "name": skill.name,
                "proficiency": skill.proficiency,
                "description": skill.description,
            }
            for skill in skills
        ]
    )


@api_view(["GET"])
def projects_api(request):
    projects = Project.objects.all().order_by("-featured", "-created_at")
    return Response(
        [
            {
                "id": project.id,
                "title": project.title,
                "summary": project.summary,
                "description": project.description,
                "impact": project.impact,
                "technologies": project.technologies,
                "repo_url": project.repo_url,
                "demo_url": project.demo_url,
                "featured": project.featured,
                "category": project.category,
            }
            for project in projects
        ]
    )


@api_view(["GET"])
def experience_api(request):
    experiences = Experience.objects.all().order_by("-id")
    return Response(
        [
            {
                "id": item.id,
                "role": item.role,
                "company": item.company,
                "period": item.period,
                "location": item.location,
                "description": item.description,
                "highlights": item.highlights,
            }
            for item in experiences
        ]
    )


@api_view(["POST", "GET"])
def chat_api(request):
    """
    RAG-powered chat endpoint with Grok LLM integration.
    Supports:
      - text/event-stream (SSE) when 'stream': true or Accept: text/event-stream
      - application/json standard response when requested
    """
    if request.method == "GET":
        return Response(
            {
                "answer": "I am Sinan's personal assistant. Ask me anything about his skills, projects, experience, or background!"
            }
        )

    payload = (
        request.data
        if hasattr(request, "data") and request.data
        else json.loads(request.body.decode("utf-8"))
    )
    question = (payload.get("question") or "").strip()

    if not question:
        return Response(
            {
                "answer": "Please ask a question about Sinan's background, skills, or projects."
            },
            status=400,
        )

    # Check if client requested streaming
    wants_stream = payload.get(
        "stream", True
    ) is True or "text/event-stream" in request.headers.get("Accept", "")

    try:
        from portfolio.ai.rag import ask

        if wants_stream:

            def event_stream():
                for token in ask(question):
                    yield f"data: {json.dumps({'token': token})}\n\n"
                yield "data: [DONE]\n\n"

            response = StreamingHttpResponse(
                event_stream(), content_type="text/event-stream"
            )
            response["Cache-Control"] = "no-cache"
            response["X-Accel-Buffering"] = "no"  # For Nginx reverse-proxy streaming
            return response

        # Non-streaming JSON fallback
        full_answer = "".join(ask(question))
        return Response({"answer": full_answer, "question": question})

    except Exception as exc:
        return Response(
            {
                "answer": "I'm having trouble retrieving that information right now. Please try again or email sinanmansooor@gmail.com."
            },
            status=500,
        )


@api_view(["GET"])
def knowledge_api(request):
    entries = KnowledgeEntry.objects.all().order_by("-id")
    return Response(
        [
            {
                "id": entry.id,
                "title": entry.title,
                "category": entry.category,
                "content": entry.content,
                "tags": entry.tags,
            }
            for entry in entries
        ]
    )
