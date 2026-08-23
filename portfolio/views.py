import json

from django.http import JsonResponse
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Experience, KnowledgeEntry, Profile, Project, Skill


def home(request):
    profile = Profile.objects.first()
    featured_projects = Project.objects.filter(featured=True).order_by('-created_at')[:4]
    skills = Skill.objects.all().order_by('category', 'name')
    experiences = Experience.objects.all().order_by('-id')
    return render(
        request,
        'portfolio/index.html',
        {
            'profile': profile,
            'featured_projects': featured_projects,
            'skills': skills,
            'experiences': experiences,
        },
    )


@api_view(['GET'])
def profile_api(request):
    profile = Profile.objects.first()
    if not profile:
        return Response({})
    return Response({
        'name': profile.name,
        'headline': profile.headline,
        'summary': profile.summary,
        'location': profile.location,
        'email': profile.email,
        'github_url': profile.github_url,
        'linkedin_url': profile.linkedin_url,
        'resume_url': profile.resume_url,
        'availability': profile.availability,
        'work_style': profile.work_style,
        'tags': profile.tags,
    })


@api_view(['GET'])
def skills_api(request):
    skills = Skill.objects.all().order_by('category', 'name')
    return Response([
        {
            'id': skill.id,
            'category': skill.category,
            'name': skill.name,
            'proficiency': skill.proficiency,
            'description': skill.description,
        }
        for skill in skills
    ])


@api_view(['GET'])
def projects_api(request):
    projects = Project.objects.all().order_by('-featured', '-created_at')
    return Response([
        {
            'id': project.id,
            'title': project.title,
            'summary': project.summary,
            'description': project.description,
            'impact': project.impact,
            'technologies': project.technologies,
            'repo_url': project.repo_url,
            'demo_url': project.demo_url,
            'featured': project.featured,
            'category': project.category,
        }
        for project in projects
    ])


@api_view(['GET'])
def experience_api(request):
    experiences = Experience.objects.all().order_by('-id')
    return Response([
        {
            'id': item.id,
            'role': item.role,
            'company': item.company,
            'period': item.period,
            'location': item.location,
            'description': item.description,
            'highlights': item.highlights,
        }
        for item in experiences
    ])


@api_view(['POST', 'GET'])
def chat_api(request):
    profile = Profile.objects.first()
    skills = list(Skill.objects.all())
    projects = list(Project.objects.all())
    experiences = list(Experience.objects.all())
    knowledge = list(KnowledgeEntry.objects.all())

    if request.method == 'GET':
        return Response({'answer': 'Ask me about my projects, skills, experience, education, achievements, or availability.'})

    payload = request.data if hasattr(request, 'data') and request.data else json.loads(request.body.decode('utf-8'))
    question = (payload.get('question') or '').strip()

    if not question:
        return Response({'answer': 'Please ask something about my work, skills, projects, education, or AI engineering background.'})

    lowered = question.lower()

    if any(term in lowered for term in ['who are you', 'tell me about yourself', 'about you', 'bio', 'yourself']):
        answer = profile.summary if profile else 'I am an AI Engineer and Python Developer focused on ML, NLP, computer vision, and real-world AI deployment.'
        source = 'Profile'
    elif any(term in lowered for term in ['skill', 'stack', 'technology', 'tools', 'python', 'django', 'ai', 'ml', 'llm', 'tensorflow', 'nlp', 'computer vision']):
        skill_text = ', '.join(skill.name for skill in skills[:12])
        answer = f'My technical stack includes {skill_text}. I work across machine learning, deep learning, NLP, computer vision, Django APIs, and AI product building.'
        source = 'Skills'
    elif any(term in lowered for term in ['project', 'portfolio', 'work', 'built', 'case study', 'show me your work', 'project list']):
        project_names = ', '.join(project.title for project in projects[:4])
        answer = f'I have built projects including {project_names}. These include AI hiring workflows, voice assistants, deep learning emotion systems, and ML-based detection systems.'
        source = 'Projects'
    elif any(term in lowered for term in ['experience', 'worked', 'career', 'background', 'job', 'role', 'internship']):
        exp_text = '; '.join(f'{item.role} at {item.company}' for item in experiences[:3])
        answer = f'My experience includes {exp_text}. I worked on applied research and AI systems using Python, deep learning, and evaluation-driven development.'
        source = 'Experience'
    elif any(term in lowered for term in ['education', 'degree', 'college', 'iit', 'yenepoya', 'graduate', 'study']):
        answer = 'I am pursuing a Bachelor of Engineering in Artificial Intelligence & Machine Learning at Yenepoya Institute of Technology (2022–2026). I also completed the IIT Kharagpur hands-on AI for Real-world Applications program and ranked in the top 10% nationally.'
        source = 'Education'
    elif any(term in lowered for term in ['achievement', 'award', 'certificate', 'top 10', 'merit']):
        answer = 'I received a merit certificate from IIT Kharagpur for ranking in the top 10% nationally in AI and deep learning, and I was selected for the NIT Calicut machine learning research internship from a national applicant pool.'
        source = 'Achievement'
    elif any(term in lowered for term in ['contact', 'hire', 'reach', 'email', 'linkedin', 'github', 'availability', 'available', 'recruiter']):
        email = profile.email if profile else 'sinanmansooor@gmail.com'
        answer = f'You can reach me at {email}. I am open to AI Engineer and ML Engineer roles and am based in Bangalore, India. I am also active on GitHub and LinkedIn for project and profile details.'
        source = 'Contact'
    elif any(term in lowered for term in ['why hire me', 'why should i hire you', 'best fit', 'role fit', 'ai engineer', 'ai developer', 'ml engineer']):
        answer = 'I bring a strong combination of AI engineering fundamentals, applied ML experience, Python and Django development, and a product-focused mindset. I have built deployed AI applications, worked on deep learning and NLP use cases, and I am eager to contribute to real-world AI systems and engineering teams.'
        source = 'Profile'
    elif any(term in lowered for term in ['resume', 'cv', 'experience pdf', 'download']):
        resume_url = profile.resume_url if profile else '/static/RESUME.pdf'
        answer = f'You can view my resume here: {resume_url}'
        source = 'Resume'
    else:
        answer = 'I can answer only questions about my background, skills, projects, education, achievements, and availability. Ask me about my AI work, backend experience, or fit for an AI engineer role.'
        source = 'Assistant'

    return Response({
        'answer': answer,
        'source': source,
        'safe': True,
        'question': question,
        'knowledge': [
            {'title': entry.title, 'category': entry.category, 'tags': entry.tags}
            for entry in knowledge[:6]
        ],
    })


@api_view(['GET'])
def knowledge_api(request):
    entries = KnowledgeEntry.objects.all().order_by('-id')
    return Response([
        {
            'id': entry.id,
            'title': entry.title,
            'category': entry.category,
            'content': entry.content,
            'tags': entry.tags,
        }
        for entry in entries
    ])
