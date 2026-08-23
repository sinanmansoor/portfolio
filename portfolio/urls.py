from django.urls import path

from .views import (
    chat_api,
    experience_api,
    home,
    knowledge_api,
    profile_api,
    projects_api,
    skills_api,
)

urlpatterns = [
    path('', home, name='home'),
    path('api/profile/', profile_api, name='profile_api'),
    path('api/skills/', skills_api, name='skills_api'),
    path('api/projects/', projects_api, name='projects_api'),
    path('api/experience/', experience_api, name='experience_api'),
    path('api/knowledge/', knowledge_api, name='knowledge_api'),
    path('api/chat/', chat_api, name='chat_api'),
]
