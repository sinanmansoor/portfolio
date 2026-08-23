from django.db import models


class Profile(models.Model):
    name = models.CharField(max_length=120, default='Your Name')
    headline = models.CharField(max_length=200, default='AI Engineer / Developer')
    summary = models.TextField(default='I build AI products, robust backend systems, and interactive tools that solve real user problems.')
    location = models.CharField(max_length=120, default='Remote / India')
    email = models.EmailField(default='you@example.com')
    github_url = models.URLField(blank=True, default='https://github.com/yourusername')
    linkedin_url = models.URLField(blank=True, default='https://linkedin.com/in/yourusername')
    resume_url = models.URLField(blank=True, default='')
    availability = models.CharField(max_length=120, default='Open to AI Engineer roles')
    work_style = models.TextField(default='Product-minded, research-driven, and strong on engineering execution.')
    tags = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.name


class Skill(models.Model):
    CATEGORY_CHOICES = [
        ('AI', 'AI'),
        ('Backend', 'Backend'),
        ('Frontend', 'Frontend'),
        ('Data', 'Data'),
        ('Cloud', 'Cloud'),
        ('Tools', 'Tools'),
    ]
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='AI')
    name = models.CharField(max_length=100)
    proficiency = models.IntegerField(default=80)
    description = models.TextField(blank=True)

    def __str__(self):
        return f'{self.name} ({self.category})'


class Project(models.Model):
    title = models.CharField(max_length=200)
    summary = models.TextField()
    description = models.TextField(blank=True)
    impact = models.CharField(max_length=200, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    repo_url = models.URLField(blank=True)
    demo_url = models.URLField(blank=True)
    featured = models.BooleanField(default=False)
    category = models.CharField(max_length=80, default='AI')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class Experience(models.Model):
    role = models.CharField(max_length=150)
    company = models.CharField(max_length=150)
    period = models.CharField(max_length=80)
    location = models.CharField(max_length=120, blank=True)
    description = models.TextField()
    highlights = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f'{self.role} @ {self.company}'


class KnowledgeEntry(models.Model):
    CATEGORY_CHOICES = [
        ('Bio', 'Bio'),
        ('Skill', 'Skill'),
        ('Project', 'Project'),
        ('Experience', 'Experience'),
        ('Achievement', 'Achievement'),
        ('Education', 'Education'),
        ('General', 'General'),
    ]
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default='General')
    content = models.TextField()
    tags = models.JSONField(default=list, blank=True)

    def __str__(self):
        return self.title
