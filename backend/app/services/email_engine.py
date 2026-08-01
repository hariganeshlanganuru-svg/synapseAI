import smtplib
import ssl
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings


async def generate_email_draft(prompt: str, recipient: str = "harithalanganuru@gmail.com") -> dict:
    clean_prompt = prompt
    for prefix in ["HR Notice:", "Notice:", "Policy Notice:", "HR Notification:"]:
        if clean_prompt.lower().startswith(prefix.lower()):
            clean_prompt = clean_prompt[len(prefix):].strip()
            
    subject = f"HR Policy Notice: {clean_prompt}" if len(clean_prompt) <= 60 else f"HR Policy Notice: {clean_prompt[:55]}..."
    body = (
        f"Dear Colleague,\n\n"
        f"This official notification is dispatched by SynapseAI Enterprise Assistant:\n\n"
        f"{clean_prompt}\n\n"
        f"If you have any questions, please reach out to the HR Department or your reporting manager.\n\n"
        f"Best regards,\n"
        f"HR Department — SynapseAI Enterprise Assistant"
    )
    return {"recipient": recipient, "subject": subject, "body": body, "status": "DRAFT"}


async def send_email(recipient: str, subject: str, body: str) -> dict:
    """
    Dispatches emails via SMTP.
    Tries port 587 STARTTLS -> port 465 SSL -> records as simulated.

    Gmail: requires App Password (NOT regular password).
    Generate at: myaccount.google.com -> Security -> App Passwords
    """
    try:
        sender_email = settings.SMTP_USER
        sender_password = settings.SMTP_PASSWORD
        smtp_host = settings.SMTP_HOST

        status = "SENT_LOCAL_SIMULATED"
        error_msg = None

        # Detect placeholder / weak passwords
        clean_pwd = sender_password.replace(" ", "")
        bad_hints = ["your-app-password", "your-password", "password123", "secret"]
        has_real_creds = (
            bool(sender_email)
            and bool(sender_password)
            and "@" in sender_email
            and len(clean_pwd) >= 16            # Gmail App Passwords are 16 chars
            and not any(h in clean_pwd.lower() for h in bad_hints)
        )

        if has_real_creds:
            msg = MIMEMultipart()
            msg["From"] = sender_email
            msg["To"] = recipient
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))

            # Try 587 STARTTLS
            try:
                server = smtplib.SMTP(smtp_host, 587, timeout=12)
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(sender_email, clean_pwd)
                server.sendmail(sender_email, recipient, msg.as_string())
                server.quit()
                status = "SENT"
                print(f"[SMTP OK] Sent to {recipient} via {smtp_host}:587")
            except smtplib.SMTPAuthenticationError as e:
                error_msg = f"Auth failed — use Gmail App Password (16 chars). Error: {e}"
            except Exception as e1:
                # Try 465 SSL
                try:
                    ctx = ssl.create_default_context()
                    with smtplib.SMTP_SSL(smtp_host, 465, context=ctx, timeout=12) as s:
                        s.login(sender_email, clean_pwd)
                        s.sendmail(sender_email, recipient, msg.as_string())
                    status = "SENT"
                    print(f"[SMTP OK] Sent to {recipient} via {smtp_host}:465 (SSL)")
                except smtplib.SMTPAuthenticationError as e:
                    error_msg = f"Auth failed — Gmail App Password required. Error: {e}"
                except Exception as e2:
                    error_msg = f"SMTP error: {e1} / {e2}"
        else:
            error_msg = (
                "Gmail App Password required (16-char code). "
                "Regular passwords blocked by Google since 2022. "
                "Generate at: myaccount.google.com -> Security -> App Passwords"
            )
            print(f"[SMTP Simulated] {error_msg}")

        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        iso_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()

        return {
            "email_id": f"eml-{now_ts}",
            "sender": sender_email or "noreply@synapseai.internal",
            "recipient": recipient,
            "subject": subject,
            "status": status,
            "error": error_msg,
            "smtp_guide": "Generate App Password: myaccount.google.com -> Security -> App Passwords -> update SMTP_PASSWORD in .env" if status != "SENT" else None,
            "timestamp": iso_ts
        }
    except Exception as exc:
        now_ts = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
        iso_ts = datetime.datetime.now(datetime.timezone.utc).isoformat()
        print(f"[SMTP Exception]: {exc}")
        return {
            "email_id": f"eml-err-{now_ts}",
            "sender": getattr(settings, 'SMTP_USER', 'noreply@synapseai.internal'),
            "recipient": recipient,
            "subject": subject,
            "status": "SENT_LOCAL_SIMULATED",
            "error": f"Recorded locally (SMTP sandbox). Detail: {exc}",
            "smtp_guide": "Generate App Password: myaccount.google.com -> Security -> App Passwords -> update SMTP_PASSWORD in .env",
            "timestamp": iso_ts
        }

