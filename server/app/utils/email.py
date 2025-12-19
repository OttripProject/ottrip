from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.common.config import email_settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def build_invitation_accept_link(token: str) -> str:
    base = email_settings.INVITE_ACCEPT_URL_BASE
    return f"{base.rstrip('/')}#invite={token}"


def send_invitation_email(
    *,
    to_email: str,
    plan_title: str,
    role: str,
    accept_link: str,
    expires_at_iso: Optional[str],
) -> None:

    subject = f"[Ottrip] '{plan_title}' 계획에 초대되었습니다"
    html = (
        f"<p>여행 계획 '<b>{plan_title}</b>'에 <b>{role}</b> 권한으로 초대되었습니다.</p>"
        f"<p><a href='{accept_link}'>여기를 눌러 초대를 수락</a>해주세요.</p>"
        + (f"<p>만료 시각: {expires_at_iso}</p>" if expires_at_iso else "")
    )

    email_from = email_settings.EMAIL_FROM

    if (email_settings.EMAIL_PROVIDER or "").lower() == "sendgrid":
        api_key = email_settings.SENDGRID_API_KEY
        from_email = email_settings.EMAIL_FROM or email_from
        if not api_key or not from_email:
            raise RuntimeError("SENDGRID_API_KEY/EMAIL_FROM missing for HTTP email provider")
        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        sg = SendGridAPIClient(api_key=api_key)
        response = sg.send(message)

    if not smtp_host or not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP configuration is missing. Set SMTP_HOST/SMTP_USER/SMTP_PASS.")

    msg = MIMEMultipart("alternative")
    msg["From"] = email_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", _charset="utf-8"))

    if use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(email_from, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            if use_starttls:
                server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(email_from, [to_email], msg.as_string())


