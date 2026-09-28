"""URL configuration for portfolio_ai project."""
from django.urls import include, path

urlpatterns = [
    path('', include('portfolio.urls')),
]
