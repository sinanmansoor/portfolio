"""URL configuration for portfolio_ai project."""
from django.urls import include, path

urlpatterns = [
    path('', include('portfolio.urls')),
]

handler404 = 'portfolio.views.not_found'
