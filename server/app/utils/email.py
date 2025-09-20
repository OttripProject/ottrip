from __future__ import annotations

import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from app.common.config import email_settings


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
    logger = logging.getLogger(__name__)
    subject = f"[Ottrip] '{plan_title}' 계획에 초대되었습니다"
    html = (
        f"<p>여행 계획 '<b>{plan_title}</b>'에 <b>{role}</b> 권한으로 초대되었습니다.</p>"
        f"<p><a href='{accept_link}'>여기를 눌러 초대를 수락</a>해주세요.</p>"
        + (f"<p>만료 시각: {expires_at_iso}</p>" if expires_at_iso else "")
    )

    email_from = email_settings.EMAIL_FROM
    smtp_host = email_settings.SMTP_HOST
    smtp_port = email_settings.SMTP_PORT
    smtp_user = email_settings.SMTP_USER
    smtp_pass = email_settings.SMTP_PASS
    use_ssl = email_settings.SMTP_SSL
    use_starttls = email_settings.SMTP_STARTTLS

    if not smtp_host or not smtp_user or not smtp_pass:
        raise RuntimeError("SMTP configuration is missing. Set SMTP_HOST/SMTP_USER/SMTP_PASS.")

    logger.info(
        "smtp.config",
        extra={
            "host": smtp_host,
            "port": smtp_port,
            "ssl": use_ssl,
            "starttls": use_starttls,
            "from": email_from,
            "to": to_email,
        },
    )

    msg = MIMEMultipart("alternative")
    msg["From"] = email_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(html, "html", _charset="utf-8"))

    try:
        if use_ssl:
            logger.info("smtp.ssl.connect.start")
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                logger.info("smtp.ssl.connect.ok")
                logger.info("smtp.login.start")
                server.login(smtp_user, smtp_pass)
                logger.info("smtp.login.ok")
                logger.info("smtp.send.start")
                server.sendmail(email_from, [to_email], msg.as_string())
                logger.info("smtp.send.ok")
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if use_starttls:
                    logger.info("smtp.starttls.start")
                    server.starttls()
                    logger.info("smtp.starttls.ok")
                logger.info("smtp.login.start")
                server.login(smtp_user, smtp_pass)
                logger.info("smtp.login.ok")
                logger.info("smtp.send.start")
                server.sendmail(email_from, [to_email], msg.as_string())
                logger.info("smtp.send.ok")
    except Exception:
        logger.exception("smtp.error")
        raise


