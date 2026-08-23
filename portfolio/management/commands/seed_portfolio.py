from django.core.management.base import BaseCommand

from portfolio.models import Experience, KnowledgeEntry, Profile, Project, Skill


class Command(BaseCommand):
    help = 'Seeds the portfolio with real resume-based information for the personal AI portfolio.'

    def handle(self, *args, **options):
        Profile.objects.all().delete()
        Skill.objects.all().delete()
        Project.objects.all().delete()
        Experience.objects.all().delete()
        KnowledgeEntry.objects.all().delete()

        profile = Profile.objects.create(
            name='MOHAMMED SINAN MANSOOR',
            headline='AI Engineer and Python Developer',
            summary='AI Engineer and Python Developer (2026 graduate) skilled in machine learning model training, model deployment, data science, NLP, computer vision, and deep learning. Built production-ready AI applications using Python, Django, TensorFlow, scikit-learn, and REST API development. Applied supervised learning and unsupervised learning at NIT Calicut. IIT Kharagpur certified — top 10% nationally. Seeking a Machine Learning Engineer / ML Engineer / AI Engineer role to deliver data-driven, intelligent, scalable systems through analytical problem solving.',
            location='Bangalore, India',
            email='sinanmansooor@gmail.com',
            github_url='https://github.com/sinanmansoor',
            linkedin_url='https://linkedin.com/in/sinanmansoor',
            resume_url='/static/RESUME.pdf',
            availability='Open to AI Engineer / ML Engineer roles',
            work_style='Research-driven, execution-focused, and strong in Python, AI systems, and deployment workflows.',
            tags=['AI Engineer', 'ML Engineer', 'Python', 'Django', 'NLP', 'Computer Vision', 'TensorFlow', 'RAG', 'LLM'],
        )

        self.stdout.write(self.style.SUCCESS(f'Created profile: {profile.name}'))

        skills = [
            ('AI', 'Python', 95, 'Core language for model building, backend engineering, and AI deployment workflows.'),
            ('AI', 'Machine Learning', 94, 'Applied supervised learning, unsupervised learning, and evaluation-driven experimentation.'),
            ('AI', 'Deep Learning', 93, 'Neural networks, transformers, and model design for computer vision and NLP tasks.'),
            ('AI', 'NLP', 90, 'Text understanding, language processing, and assistant-related intelligence systems.'),
            ('AI', 'Computer Vision', 90, 'OpenCV-based image and video-driven AI workflows.'),
            ('AI', 'RAG', 82, 'Retrieval-based AI assistant design and grounded response systems.'),
            ('AI', 'LangChain', 78, 'Prompt orchestration and AI workflows for practical apps.'),
            ('Backend', 'Django', 93, 'Building data-driven web apps and production-grade APIs.'),
            ('Backend', 'REST API Development', 94, 'Designing clean interfaces for production-ready services.'),
            ('Data', 'TensorFlow', 89, 'Deep learning model training and implementation.'),
            ('Data', 'scikit-learn', 91, 'Model training, evaluation, feature engineering, and benchmarking.'),
            ('Data', 'Pandas', 88, 'Data processing and analytics for ML pipelines.'),
            ('Data', 'NumPy', 90, 'Efficient numerical processing and scientific workloads.'),
            ('Data', 'SQL', 83, 'Data modeling and querying for AI and web applications.'),
            ('Frontend', 'JavaScript', 85, 'Interactive UI behavior and frontend product polish.'),
            ('Frontend', 'HTML', 84, 'Structured UI and content presentation.'),
            ('Frontend', 'CSS', 84, 'Responsive styling and product aesthetics.'),
            ('Tools', 'Git', 90, 'Version control and team engineering workflows.'),
            ('Tools', 'Jupyter', 88, 'Research, experimentation, and iterative analysis.'),
            ('Tools', 'Linux', 84, 'Development environment and deployment operations.'),
            ('Tools', 'MySQL', 80, 'Application storage and relational data handling.'),
        ]

        for category, name, proficiency, description in skills:
            Skill.objects.create(category=category, name=name, proficiency=proficiency, description=description)

        Project.objects.create(
            title='AI Placement Co-Pilot',
            summary='Production-ready AI web application for role-fit scoring, skill-gap detection, and automated ATS resume generation using Python, Django, and LLaMA-3.3-70B.',
            description='Built a 5-step pipeline for role-fit evaluation, resume generation, and candidate readiness analysis. Integrated LLaMA-3.3-70B for real-time inference and deployed the end-to-end system.',
            impact='Deployed AI hiring workflow',
            technologies=['Python', 'Django', 'REST API', 'HTML', 'CSS', 'JavaScript', 'LLM'],
            repo_url='https://github.com/sinanmansoor',
            demo_url='#',
            featured=True,
            category='AI',
        )

        Project.objects.create(
            title='Emotional Assistant Bot',
            summary='Multimodal deep learning system that fuses audio and video streams for real-time emotion detection and classification.',
            description='Built a supervised-learning pipeline with a neural network transformer-based approach that improved accuracy by 20%+ over single-modality baselines.',
            impact='20%+ gain over unimodal baselines',
            technologies=['Python', 'TensorFlow', 'OpenCV', 'Neural Networks', 'Audio/Video ML'],
            repo_url='https://github.com/sinanmansoor',
            demo_url='#',
            featured=True,
            category='Deep Learning',
        )

        Project.objects.create(
            title='Agri Bot — Multilingual Voice Assistant',
            summary='NLP and speech recognition system using ASR + TTS for agricultural data queries in native languages.',
            description='Built multilingual voice assistant capabilities for farmers and agricultural use cases, using speech and language pipelines to serve approximately 500 users.',
            impact='Served ~500 users',
            technologies=['Python', 'NLP', 'ASR', 'TTS', 'Speech Recognition'],
            repo_url='https://github.com/sinanmansoor',
            demo_url='#',
            featured=True,
            category='Voice AI',
        )

        Project.objects.create(
            title='ML Intrusion Detection System',
            summary='Random Forest-based intrusion detection model for network traffic classification and anomaly detection.',
            description='Trained and evaluated a machine learning classification algorithm to achieve 97%+ detection accuracy with less than 2% false-positive rate using cross-validation and model benchmarking.',
            impact='97%+ accuracy with <2% false positives',
            technologies=['Python', 'scikit-learn', 'Random Forest', 'Model Evaluation'],
            repo_url='https://github.com/sinanmansoor',
            demo_url='#',
            featured=False,
            category='AI Security',
        )

        Project.objects.create(
            title='Emotion-Driven Music Player',
            summary='Computer vision system that classifies 7 emotional states from facial expressions and automates a real-time playlist.',
            description='Used OpenCV and neural network-based facial recognition to detect emotions and automate music selection in real time with 89% accuracy.',
            impact='89% emotion classification accuracy',
            technologies=['OpenCV', 'Computer Vision', 'Python', 'Neural Networks'],
            repo_url='https://github.com/sinanmansoor',
            demo_url='#',
            featured=False,
            category='Vision AI',
        )

        Experience.objects.create(
            role='Machine Learning Research Intern',
            company='National Institute of Technology (NIT) Calicut',
            period='Sep 2025 – Nov 2025',
            location='Kerala, India',
            description='Applied supervised learning algorithms and neural network models in Python for civil engineering data analysis, reducing manual estimation time by 40% through intelligent automation.',
            highlights=['Built preprocessing, feature engineering, and regression pipelines.', 'Improved model evaluation accuracy by 15% through cross-validation and benchmarking.', 'Worked in applied research with practical AI outcomes.'],
        )

        KnowledgeEntry.objects.create(
            title='Career positioning',
            category='Bio',
            content='I am an AI Engineer and Python Developer focused on machine learning, model deployment, NLP, computer vision, and deep learning. I am looking for AI Engineer, ML Engineer, and AI product roles that require strong analytical thinking and deployment-ready systems.',
            tags=['bio', 'career', 'ai'],
        )

        KnowledgeEntry.objects.create(
            title='Core strengths',
            category='Skill',
            content='My strengths include machine learning, model training and evaluation, deep learning, Django-based application development, API design, and building AI products from prototype to deployment.',
            tags=['skills', 'strengths', 'ai'],
        )

        KnowledgeEntry.objects.create(
            title='Research internship',
            category='Experience',
            content='During my internship at NIT Calicut, I applied supervised learning and neural network models to civil engineering data analysis, reducing manual estimation time by 40% and increasing evaluation accuracy by 15%.',
            tags=['internship', 'research', 'experience'],
        )

        KnowledgeEntry.objects.create(
            title='Merit certificate',
            category='Achievement',
            content='I secured a top 10% national ranking in an IIT Kharagpur AI and deep learning program and received a merit certificate for performance optimization of ML models and data science work.',
            tags=['achievement', 'iit', 'merit'],
        )

        KnowledgeEntry.objects.create(
            title='Education',
            category='Education',
            content='Bachelor of Engineering in Artificial Intelligence & Machine Learning at Yenepoya Institute of Technology (Oct 2022 – May 2026). Completed a hands-on AI for Real-world Applications program at IIT Kharagpur (Jul – Oct 2024) with a top 10% national ranking.',
            tags=['education', 'graduation', 'iit'],
        )

        self.stdout.write(self.style.SUCCESS('Portfolio seeded successfully with real resume data.'))
