from django.urls import path

from .views import (
    chat_api,
    experience_api,
    hire,
    home,
    project_detail,
    resume,
    profile_api,
    projects_api,
    skills_api,
    visit_api,
)

urlpatterns = [
    path('', home, name='home'),
    path('hire/', hire, name='hire'),
    path('resume/', resume, name='resume'),
    path('work/<slug:slug>/', project_detail, name='project'),
    path('api/profile/', profile_api, name='profile_api'),
    path('api/skills/', skills_api, name='skills_api'),
    path('api/projects/', projects_api, name='projects_api'),
    path('api/experience/', experience_api, name='experience_api'),
    path('api/chat/', chat_api, name='chat_api'),
    path('api/visit/', visit_api, name='visit_api'),
]
