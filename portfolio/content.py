"""
portfolio/content.py
─────────────────────
Everything shown on the portfolio page. Edit this file and push to update
the site. The chatbot's knowledge lives separately in portfolio/data/*.txt.
"""

PROFILE = {
    "name": "Mohammed Sinan Mansoor",
    "short_name": "Sinan",
    "initials": "SM",
    "headline": "AI Engineer · Agentic AI & LLM Apps · Full-Stack (React + Django)",
    "summary": (
        "AI engineer specialising in agentic AI and LLM applications — and a full-stack developer "
        "who builds the product around the model with React and Django. I ship AI that is useful, "
        "measurable, and reliable in production."
    ),
    "location": "Kannur, Kerala",
    "relocation": "Open to relocation",
    "timezone": "Asia/Kolkata",
    "email": "sinanmansooor@gmail.com",
    # International format, digits only (e.g. "919876543210"). Leave empty to
    # hide every WhatsApp button on the site.
    "whatsapp": "919746951354",
    "github_url": "https://github.com/sinanmansoor",
    "linkedin_url": "https://linkedin.com/in/sinanmansoor",
    "resume_url": "/static/RESUME.pdf",
    "availability": "Open to AI Engineer roles · relocation · freelance",
    "roles": ["AI Engineer", "Agentic AI Developer", "Full-Stack Dev · React + Django", "LLM & RAG Builder", "Software Engineer"],
}

STATS = [
    {"value": 97, "suffix": "%", "label": "Intrusion detection accuracy"},
    {"value": 500, "suffix": "+", "label": "Farmers served by Agri Bot", "prefix": "~"},
    {"value": 10, "suffix": "%", "label": "IIT Kharagpur national rank", "prefix": "Top "},
    {"value": 40, "suffix": "%", "label": "Manual effort cut at NIT Calicut"},
]

SKILLS = [
    {"category": "AI", "name": "Python", "proficiency": 95},
    {"category": "AI", "name": "Machine Learning", "proficiency": 94},
    {"category": "AI", "name": "Deep Learning", "proficiency": 93},
    {"category": "AI", "name": "NLP", "proficiency": 90},
    {"category": "AI", "name": "Computer Vision", "proficiency": 90},
    {"category": "AI", "name": "RAG", "proficiency": 82},
    {"category": "AI", "name": "LangChain", "proficiency": 78},
    {"category": "AI", "name": "LLMs", "proficiency": 85},
    {"category": "Backend", "name": "Django", "proficiency": 93},
    {"category": "Backend", "name": "REST APIs", "proficiency": 94},
    {"category": "Backend", "name": "Streamlit", "proficiency": 82},
    {"category": "Data", "name": "TensorFlow", "proficiency": 89},
    {"category": "Data", "name": "Keras", "proficiency": 87},
    {"category": "Data", "name": "scikit-learn", "proficiency": 91},
    {"category": "Data", "name": "OpenCV", "proficiency": 88},
    {"category": "Data", "name": "Pandas", "proficiency": 88},
    {"category": "Data", "name": "NumPy", "proficiency": 90},
    {"category": "Data", "name": "SQL", "proficiency": 83},
    {"category": "AI", "name": "Agentic AI", "proficiency": 84},
    {"category": "Frontend", "name": "React", "proficiency": 85},
    {"category": "Frontend", "name": "JavaScript", "proficiency": 86},
    {"category": "Frontend", "name": "HTML / CSS", "proficiency": 86},
    {"category": "Tools", "name": "Git", "proficiency": 90},
    {"category": "Tools", "name": "Linux", "proficiency": 84},
    {"category": "Tools", "name": "Jupyter", "proficiency": 88},
]

# Rings of the orbiting skills map, innermost first.
SKILL_ORBITS = [
    ["Python", "TensorFlow", "Transformers", "LLMs"],
    ["NLP", "Computer Vision", "RAG", "Django", "scikit-learn", "OpenCV"],
    ["Agentic AI", "LangChain", "React", "REST APIs", "Keras", "Pandas", "SQL", "Git"],
]

PROJECTS = [
    {
        "slug": "placement-copilot",
        "title": "AI Placement Co-Pilot",
        "category": "LLM Product",
        "summary": "An AI hiring companion that scores role fit, finds skill gaps, and writes ATS-ready resumes in seconds.",
        "problem": "Students apply blindly — no signal on how well they fit a role or what to fix before applying.",
        "approach": "A 5-step Django pipeline: parse the profile, score it against the role, detect skill gaps, recommend fixes, and generate an ATS-optimised resume with LLaMA-3.3-70B in real time.",
        "impact": "Shipped end-to-end during the Vizuara AI Residency as a deployed, production-ready product.",
        "metric": "5-step",
        "metric_label": "LLM pipeline",
        "technologies": ["Python", "Django", "REST API", "LLaMA-3.3-70B", "JavaScript"],
        "accent": "#8b7dff",
        "repo_url": "",
        "steps": ["Candidate profile", "Role-fit scoring", "Skill-gap detection", "Recommendations", "ATS resume (LLaMA-3.3-70B)"],
        "featured": True,
    },
    {
        "slug": "emotional-assistant",
        "title": "Emotional Assistant Bot",
        "category": "Multimodal Deep Learning · Major Project",
        "summary": "Reads emotion from voice and face at the same time — and beats single-signal models by 20%+.",
        "problem": "Emotion models that only listen or only look miss half the signal and misread people.",
        "approach": "Fused audio and video streams in a transformer-based neural network trained with supervised learning, running inference in real time.",
        "impact": "20%+ accuracy gain over single-modality baselines.",
        "metric": "+20%",
        "metric_label": "vs unimodal",
        "technologies": ["TensorFlow", "Keras", "Transformers", "OpenCV", "Audio ML"],
        "accent": "#c084fc",
        "repo_url": "",
        "steps": ["Audio stream", "Video stream", "Feature extraction", "Transformer fusion", "Emotion class"],
        "featured": True,
    },
    {
        "slug": "agri-bot",
        "title": "Agri Bot",
        "category": "Voice AI · NLP",
        "summary": "A multilingual voice assistant that lets farmers ask for agricultural data in their own language.",
        "problem": "Critical farming data sits behind text interfaces in languages many farmers don't read.",
        "approach": "Built an ASR → NLP → TTS pipeline so farmers speak naturally in native languages and hear answers back.",
        "impact": "Deployed and serving roughly 500 users.",
        "metric": "~500",
        "metric_label": "active users",
        "technologies": ["Python", "NLP", "ASR", "TTS", "Speech Recognition"],
        "accent": "#22d3ee",
        "repo_url": "",
        "steps": ["Farmer speaks", "ASR (speech → text)", "NLP understanding", "Agri data lookup", "TTS answer"],
        "featured": True,
    },
    {
        "slug": "intrusion-detection",
        "title": "ML Intrusion Detection",
        "category": "ML · Cybersecurity",
        "summary": "A network-traffic classifier that catches intrusions with 97%+ accuracy and under 2% false alarms.",
        "problem": "Security teams drown in false positives from rule-based intrusion alerts.",
        "approach": "Engineered traffic features and trained a Random Forest, validated with cross-validation and benchmarking against alternatives.",
        "impact": "97%+ detection accuracy with a false-positive rate below 2%.",
        "metric": "97%",
        "metric_label": "accuracy",
        "technologies": ["scikit-learn", "Random Forest", "Pandas", "Cross-validation"],
        "accent": "#fb923c",
        "repo_url": "https://github.com/sinanmansoor/intrusion-detection-using-ml",
        "steps": ["Network traffic", "Feature engineering", "Random Forest", "Cross-validation", "Intrusion alert"],
        "featured": True,
    },
    {
        "slug": "emotion-music",
        "title": "Emotion-Driven Music Player",
        "category": "Computer Vision",
        "summary": "Looks at your face, reads one of 7 emotions, and changes the playlist to match — live.",
        "problem": "Playlists don't know how you feel right now.",
        "approach": "OpenCV face detection plus a neural-network classifier for 7 emotional states, wired to real-time playlist automation.",
        "impact": "89% classification accuracy across 7 emotions.",
        "metric": "89%",
        "metric_label": "7-class accuracy",
        "technologies": ["OpenCV", "Neural Networks", "Python", "Computer Vision"],
        "accent": "#f472b6",
        "repo_url": "https://github.com/sinanmansoor/EMOTION-DETECTION-MUSIC-PLAYER",
        "steps": ["Webcam frame", "Face detection (OpenCV)", "Emotion network · 7 classes", "Playlist engine", "Music plays"],
        "featured": True,
    },
]

EXPERIENCES = [
    {
        "kind": "Experience",
        "role": "Machine Learning Research Intern",
        "company": "NIT Calicut",
        "period": "Sep 2025 – Nov 2025",
        "location": "Kerala, India",
        "description": "Applied supervised learning and neural networks to civil-engineering data — competitively selected from a national applicant pool.",
        "highlights": [
            "Cut manual estimation time by 40% through intelligent automation",
            "Built preprocessing, feature engineering, and regression pipelines",
            "Improved model evaluation accuracy by 15% with cross-validation and benchmarking",
        ],
    },
    {
        "kind": "Residency",
        "role": "AI Resident",
        "company": "Vizuara AI Residency",
        "period": "Residency program",
        "location": "Remote",
        "description": "Built and shipped the AI Placement Co-Pilot — a deployed LLM product — in a structured residency program.",
        "highlights": [
            "Designed a 5-step LLM pipeline with LLaMA-3.3-70B",
            "Took the product from idea to deployment end-to-end",
        ],
    },
    {
        "kind": "Certification",
        "role": "Hands-on AI for Real-world Applications",
        "company": "IIT Kharagpur",
        "period": "Jul 2024 – Oct 2024",
        "location": "India",
        "description": "Merit certificate — ranked in the top 10% of all participants nationwide.",
        "highlights": [
            "Deep learning, ML performance optimisation, and data science",
        ],
    },
    {
        "kind": "Education",
        "role": "B.E. Artificial Intelligence & Machine Learning",
        "company": "Yenepoya Institute of Technology",
        "period": "2022 – 2026",
        "location": "Karnataka, India",
        "description": "Hands-on AI and ML engineering, Python, deep learning, and applied data science.",
        "highlights": [],
    },
]

SERVICES = [
    {
        "icon": "chat",
        "title": "AI Chatbots & RAG Assistants",
        "description": "Custom assistants trained on your documents, website, or product — answering customers 24/7, like the one on this page.",
        "tags": ["LLMs", "RAG", "WhatsApp / Web"],
    },
    {
        "icon": "agent",
        "title": "AI Agents & Automation",
        "description": "Agents that read emails, fill sheets, qualify leads, or run repetitive workflows so your team doesn't have to.",
        "tags": ["Agentic AI", "APIs", "Workflows"],
    },
    {
        "icon": "model",
        "title": "Custom ML Models",
        "description": "Prediction, classification, and forecasting models built on your data — evaluated honestly and ready to deploy.",
        "tags": ["scikit-learn", "TensorFlow", "Evaluation"],
    },
    {
        "icon": "vision",
        "title": "Computer Vision",
        "description": "Detection, recognition, and video analytics — from face and emotion recognition to quality inspection.",
        "tags": ["OpenCV", "Deep Learning", "Real-time"],
    },
    {
        "icon": "web",
        "title": "AI-Powered Web Apps",
        "description": "Full-stack products with React frontends and Django backends, with AI built in — from MVP to deployed, production-ready apps.",
        "tags": ["React", "Django", "REST APIs"],
    },
    {
        "icon": "voice",
        "title": "Voice & NLP Solutions",
        "description": "Speech-to-text, text-to-speech, and multilingual NLP — including assistants in Indian languages.",
        "tags": ["ASR", "TTS", "Multilingual"],
    },
]

PROCESS = [
    {"step": "01", "title": "Discover", "text": "A quick call or chat to understand the problem, the data, and what success looks like."},
    {"step": "02", "title": "Propose", "text": "A clear plan, timeline, and quote before any work starts — no surprises."},
    {"step": "03", "title": "Build", "text": "Short iterations with working demos so you see progress every few days."},
    {"step": "04", "title": "Ship & Support", "text": "Deployment, handover, documentation, and support after launch."},
]

BRIEF_OPTIONS = {
    "services": ["AI Chatbot", "AI Agent / Automation", "ML Model", "Computer Vision", "Web App", "Voice / NLP", "Something else"],
    "timelines": ["ASAP", "2–4 weeks", "1–2 months", "Flexible"],
}

# Freelance FAQ (hire page). Keep answers to things you actually commit to.
FAQ = [
    {
        "q": "What kind of projects do you take on?",
        "a": "AI chatbots and assistants, AI agents and automations, custom ML and computer-vision models, and full-stack web apps built with React and Django — from a first prototype to a deployed product.",
    },
    {
        "q": "How is pricing decided?",
        "a": "Every project is scoped first. Share your budget in the brief, or pick “Let's discuss” and we'll work out a plan that fits it together.",
    },
    {
        "q": "Do you work remotely?",
        "a": "Yes. Freelance projects run remotely over WhatsApp, email and video calls, with regular demos so you always see progress.",
    },
    {
        "q": "Can you work with our existing product or stack?",
        "a": "Usually, yes. I can add AI features to an existing app or API, or build a new service alongside it. Tell me what you use in the brief.",
    },
    {
        "q": "What do you need from me to get started?",
        "a": "A short description of the problem, any data or documents involved, and what success looks like. The brief builder on this page covers it in a minute.",
    },
]
