const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const quickPrompts = document.querySelectorAll('.quick-prompt');
const voiceButton = document.querySelector('.voice-btn');
const revealItems = document.querySelectorAll('.reveal');
const menuButton = document.querySelector('.menu-button');
const mobileNavPanel = document.getElementById('mobileNavPanel');

let voiceListening = false;
let speechRecognition = null;

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add('visible'));
}

function addMessage(text, type = 'bot') {
  if (!chatMessages) return;
  const row = document.createElement('div');
  row.className = `message-row ${type}`;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = type === 'bot' ? 'AI' : 'You';

  const bubble = document.createElement('div');
  bubble.className = `bubble ${type}`;
  bubble.textContent = text;

  row.appendChild(label);
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addTypingIndicator() {
  if (!chatMessages) return;
  const row = document.createElement('div');
  row.className = 'message-row bot typing-row';
  row.id = 'typingIndicator';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'bubble bot typing-bubble';
  bubble.innerHTML = '<span></span><span></span><span></span>';

  row.appendChild(label);
  row.appendChild(bubble);
  chatMessages.appendChild(row);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicator');
  if (indicator) indicator.remove();
}

function getCookie(name) {
  const cookies = document.cookie.split('; ');
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return '';
}

function speakReply(text) {
  if (!('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

async function askAssistant(question) {
  const response = await fetch('/api/chat/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken'),
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error('Could not reach the assistant right now.');
  }

  const data = await response.json();
  return data.answer || 'I can answer questions about my background, skills, projects, and availability.';
}

async function submitQuestion(question) {
  if (!question || !chatMessages || !messageInput) return;

  addMessage(question, 'user');
  messageInput.value = '';
  messageInput.disabled = true;
  addTypingIndicator();

  try {
    const answer = await askAssistant(question);
    removeTypingIndicator();
    addMessage(answer, 'bot');
    if (voiceButton && voiceButton.dataset.voiceEnabled === 'true') {
      speakReply(answer);
    }
  } catch (error) {
    removeTypingIndicator();
    addMessage(error.message || 'Something went wrong while asking the assistant.', 'bot');
  } finally {
    messageInput.disabled = false;
    messageInput.focus();
  }
}

if (chatForm && messageInput) {
  chatForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const userQuestion = messageInput.value.trim();
    await submitQuestion(userQuestion);
  });
}

quickPrompts.forEach((button) => {
  button.addEventListener('click', async () => {
    if (!messageInput) return;
    const promptMap = {
      'About me': 'Tell me about yourself',
      Projects: 'What projects have you built?',
      Skills: 'What technologies and skills do you work with?',
      'Why hire me': 'Why should I hire you for an AI engineer role?',
    };

    const prompt = promptMap[button.textContent.trim()] || button.textContent.trim();
    messageInput.value = prompt;
    await submitQuestion(prompt);
  });
});

function initializeVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (voiceButton) {
      voiceButton.textContent = 'Voice unavailable';
      voiceButton.disabled = true;
    }
    return;
  }

  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = 'en-US';
  speechRecognition.interimResults = false;
  speechRecognition.continuous = false;

  speechRecognition.onresult = (event) => {
    if (!messageInput) return;
    const transcript = event.results[0][0].transcript;
    messageInput.value = transcript;
    submitQuestion(transcript);
  };

  speechRecognition.onerror = () => {
    if (chatMessages) {
      addMessage('Voice input is unavailable in this browser right now.', 'bot');
    }
    voiceListening = false;
    if (voiceButton) {
      voiceButton.dataset.voiceEnabled = 'false';
      voiceButton.textContent = 'Voice';
    }
  };

  speechRecognition.onend = () => {
    voiceListening = false;
    if (voiceButton) {
      voiceButton.dataset.voiceEnabled = 'false';
      voiceButton.textContent = 'Voice';
    }
  };
}

if (voiceButton) {
  voiceButton.dataset.voiceEnabled = 'false';
  initializeVoiceRecognition();

  voiceButton.addEventListener('click', () => {
    if (!speechRecognition) {
      if (chatMessages) {
        addMessage('Voice input is not supported in this browser, but text chat is ready.', 'bot');
      }
      return;
    }

    if (!voiceListening) {
      voiceListening = true;
      voiceButton.dataset.voiceEnabled = 'true';
      voiceButton.textContent = 'Listening';
      speechRecognition.start();
      return;
    }

    voiceListening = false;
    voiceButton.dataset.voiceEnabled = 'false';
    voiceButton.textContent = 'Voice';
    speechRecognition.stop();
  });
}

if (menuButton && mobileNavPanel) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    mobileNavPanel.classList.toggle('open', !isOpen);
    mobileNavPanel.setAttribute('aria-hidden', String(isOpen));
  });

  mobileNavPanel.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      mobileNavPanel.classList.remove('open');
      mobileNavPanel.setAttribute('aria-hidden', 'true');
    });
  });
}
