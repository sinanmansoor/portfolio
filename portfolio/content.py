"""
portfolio/content.py
─────────────────────
Static content rendered on the portfolio page.

This replaces the old database models + seed_portfolio command — the data
never changed at runtime, so keeping it in code means no database to host,
no migrations, and a much faster cold start on serverless platforms.

Edit this file and redeploy to update the page. The chatbot's knowledge
lives in portfolio/data/*.txt.
"""

PROFILE = {
    "name": "MOHAMMED SINAN MANSOOR",
    "headline": "AI Engineer • Applied ML & Product Systems",
    "summary": (
        "I build AI systems with a practical engineering lens—combining machine learning, "
        "backend development, and product thinking to create tools that are useful, measurable, "
        "and reliable in deployment. My work spans NLP, computer vision, deep learning, and "
        "Python-based product development, with a focus on real-world impact rather than "
        "isolated experimentation."
    ),
    "location": "Bangalore, India",
    "email": "sinanmansooor@gmail.com",
    "github_url": "https://github.com/sinanmansoor",
    "linkedin_url": "https://linkedin.com/in/sinanmansoor",
    "resume_url": "/static/RESUME.pdf",
    "availability": "Open to AI Engineer / ML Engineer roles",
    "work_style": "Research-driven, execution-focused, and strong in Python, AI systems, and deployment workflows.",
    "tags": ["AI Engineer", "ML Engineer", "Python", "Django", "NLP", "Computer Vision", "TensorFlow", "RAG", "LLM"],
}

SKILLS = [
    {"category": "AI", "name": "Python", "proficiency": 95},
    {"category": "AI", "name": "Machine Learning", "proficiency": 94},
    {"category": "AI", "name": "Deep Learning", "proficiency": 93},
    {"category": "AI", "name": "NLP", "proficiency": 90},
    {"category": "AI", "name": "Computer Vision", "proficiency": 90},
    {"category": "AI", "name": "RAG", "proficiency": 82},
    {"category": "AI", "name": "LangChain", "proficiency": 78},
    {"category": "Backend", "name": "Django", "proficiency": 93},
    {"category": "Backend", "name": "REST API Development", "proficiency": 94},
    {"category": "Data", "name": "TensorFlow", "proficiency": 89},
    {"category": "Data", "name": "scikit-learn", "proficiency": 91},
    {"category": "Data", "name": "Pandas", "proficiency": 88},
    {"category": "Data", "name": "NumPy", "proficiency": 90},
    {"category": "Data", "name": "SQL", "proficiency": 83},
    {"category": "Frontend", "name": "JavaScript", "proficiency": 85},
    {"category": "Frontend", "name": "HTML", "proficiency": 84},
    {"category": "Frontend", "name": "CSS", "proficiency": 84},
    {"category": "Tools", "name": "Git", "proficiency": 90},
    {"category": "Tools", "name": "Jupyter", "proficiency": 88},
    {"category": "Tools", "name": "Linux", "proficiency": 84},
    {"category": "Tools", "name": "MySQL", "proficiency": 80},
]

# Listed in display order; only featured projects appear on the page.
PROJECTS = [
    {
        "title": "Agri Bot — Multilingual Voice Assistant",
        "summary": "NLP and speech recognition system using ASR + TTS for agricultural data queries in native languages.",
        "impact": "Served ~500 users",
        "technologies": ["Python", "NLP", "ASR", "TTS", "Speech Recognition"],
        "featured": True,
        "category": "Voice AI",
    },
    {
        "title": "Emotional Assistant Bot",
        "summary": "Multimodal deep learning system that fuses audio and video streams for real-time emotion detection and classification.",
        "impact": "20%+ gain over unimodal baselines",
        "technologies": ["Python", "TensorFlow", "OpenCV", "Neural Networks", "Audio/Video ML"],
        "featured": True,
        "category": "Deep Learning",
    },
    {
        "title": "AI Placement Co-Pilot",
        "summary": "Production-ready AI web application for role-fit scoring, skill-gap detection, and automated ATS resume generation using Python, Django, and LLaMA-3.3-70B.",
        "impact": "Deployed AI hiring workflow",
        "technologies": ["Python", "Django", "REST API", "HTML", "CSS", "JavaScript", "LLM"],
        "featured": True,
        "category": "AI",
    },
    {
        "title": "ML Intrusion Detection System",
        "summary": "Random Forest-based intrusion detection model for network traffic classification and anomaly detection.",
        "impact": "97%+ accuracy with <2% false positives",
        "technologies": ["Python", "scikit-learn", "Random Forest", "Model Evaluation"],
        "featured": False,
        "category": "AI Security",
    },
    {
        "title": "Emotion-Driven Music Player",
        "summary": "Computer vision system that classifies 7 emotional states from facial expressions and automates a real-time playlist.",
        "impact": "89% emotion classification accuracy",
        "technologies": ["OpenCV", "Computer Vision", "Python", "Neural Networks"],
        "featured": False,
        "category": "Vision AI",
    },
]

EXPERIENCES = [
    {
        "role": "Machine Learning Research Intern",
        "company": "National Institute of Technology (NIT) Calicut",
        "period": "Sep 2025 – Nov 2025",
        "location": "Kerala, India",
        "description": (
            "Applied supervised learning algorithms and neural network models in Python for civil "
            "engineering data analysis, reducing manual estimation time by 40% through intelligent automation."
        ),
        "highlights": [
            "Built preprocessing, feature engineering, and regression pipelines.",
            "Improved model evaluation accuracy by 15% through cross-validation and benchmarking.",
            "Worked in applied research with practical AI outcomes.",
        ],
    },
]
