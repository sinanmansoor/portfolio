"""
portfolio/notify.py
────────────────────
Visitor alerts. Each channel is enabled by its environment variables and
failures are logged, never raised — an alert must not break the site.

  ntfy (phone push, free, no signup):  NTFY_TOPIC  [NTFY_SERVER]
      Install the ntfy app and subscribe to the same topic name.
  Telegram:                            TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  Email (Resend, free 100/day):        RESEND_API_KEY, VISIT_NOTIFY_EMAIL
      Without a verified domain, Resend only delivers to the account's own address.
"""

import json
import logging
import os
import urllib.parse
import urllib.request

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 5


def _post(url: str, data: bytes, headers: dict) -> None:
    # Some APIs (Resend, behind Cloudflare) reject urllib's default User-Agent.
    headers = {"User-Agent": "portfolio-alerts/1.0", **headers}
    request = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS):
        pass


def _ntfy(title: str, body: str, click_url: str) -> bool:
    topic = os.environ.get("NTFY_TOPIC", "").strip()
    if not topic:
        return False
    server = os.environ.get("NTFY_SERVER", "https://ntfy.sh").rstrip("/")
    headers = {"Title": title, "Tags": "eyes", "Priority": "default"}
    if click_url:
        headers["Click"] = click_url
    # HTTP headers must be latin-1; keep the title ASCII-safe.
    headers = {k: v.encode("ascii", "ignore").decode() for k, v in headers.items()}
    _post(f"{server}/{urllib.parse.quote(topic)}", body.encode("utf-8"), headers)
    return True


def _telegram(title: str, body: str) -> bool:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not (token and chat_id):
        return False
    payload = json.dumps({"chat_id": chat_id, "text": f"{title}\n\n{body}", "disable_web_page_preview": True})
    _post(
        f"https://api.telegram.org/bot{token}/sendMessage",
        payload.encode("utf-8"),
        {"Content-Type": "application/json"},
    )
    return True


def _email(title: str, body: str) -> bool:
    api_key = os.environ.get("RESEND_API_KEY", "").strip()
    to = os.environ.get("VISIT_NOTIFY_EMAIL", "").strip()
    if not (api_key and to):
        return False
    payload = json.dumps({
        "from": os.environ.get("RESEND_FROM", "Portfolio Alerts <onboarding@resend.dev>"),
        "to": [to],
        "subject": title,
        "text": body,
    })
    _post(
        "https://api.resend.com/emails",
        payload.encode("utf-8"),
        {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"},
    )
    return True


def send_alert(title: str, body: str, click_url: str = "") -> list[str]:
    """Send to every configured channel; return the names of those that succeeded."""
    sent = []
    channels = [
        ("ntfy", lambda: _ntfy(title, body, click_url)),
        ("telegram", lambda: _telegram(title, body)),
        ("email", lambda: _email(title, body)),
    ]
    for name, send in channels:
        try:
            if send():
                sent.append(name)
        except Exception as exc:
            logger.warning("[notify] %s alert failed: %s", name, exc)
    return sent
