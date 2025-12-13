"""
Email Service using Resend

Free tier: 3,000 emails/month
"""
import resend
from app.core.config import settings


def send_verification_email(email: str, code: str, name: str = "Usuario") -> bool:
    """
    Send email verification code.

    Returns True if sent successfully, False otherwise.
    """
    if not settings.RESEND_API_KEY:
        # Dev mode - just log
        print(f"[DEV] Verification code for {email}: {code}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "Código de verificación - Uniformes",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Uniformes</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #1f2937; margin-top: 0;">Hola {name},</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        Tu código de verificación es:
                    </p>
                    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">
                            {code}
                        </span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Este código expira en <strong>10 minutos</strong>.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        Si no solicitaste este código, puedes ignorar este correo.
                    </p>
                </div>
                <div style="padding: 20px; text-align: center; background: #f3f4f6;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © 2025 Uniformes. Todos los derechos reservados.
                    </p>
                </div>
            </div>
            """
        })
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False


def send_welcome_email(email: str, name: str) -> bool:
    """
    Send welcome email after successful registration.
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Welcome email for {email}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "¡Bienvenido a Uniformes!",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Uniformes</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #1f2937; margin-top: 0;">¡Bienvenido {name}!</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        Tu cuenta ha sido creada exitosamente. Ahora puedes:
                    </p>
                    <ul style="color: #4b5563; font-size: 16px;">
                        <li>Ver el catálogo de uniformes</li>
                        <li>Realizar pedidos</li>
                        <li>Ver el estado de tus pedidos</li>
                    </ul>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{settings.FRONTEND_URL}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                            Ir a Uniformes
                        </a>
                    </div>
                </div>
                <div style="padding: 20px; text-align: center; background: #f3f4f6;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © 2025 Uniformes. Todos los derechos reservados.
                    </p>
                </div>
            </div>
            """
        })
        return True
    except Exception as e:
        print(f"Error sending welcome email: {e}")
        return False


def send_password_reset_email(email: str, code: str, name: str = "Usuario") -> bool:
    """
    Send password reset code.
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Password reset code for {email}: {code}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "Recuperar contraseña - Uniformes",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Uniformes</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb;">
                    <h2 style="color: #1f2937; margin-top: 0;">Hola {name},</h2>
                    <p style="color: #4b5563; font-size: 16px;">
                        Recibimos una solicitud para restablecer tu contraseña. Tu código es:
                    </p>
                    <div style="background: white; border: 2px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                        <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #2563eb;">
                            {code}
                        </span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Este código expira en <strong>15 minutos</strong>.
                    </p>
                    <p style="color: #6b7280; font-size: 14px;">
                        Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
                    </p>
                </div>
                <div style="padding: 20px; text-align: center; background: #f3f4f6;">
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        © 2025 Uniformes. Todos los derechos reservados.
                    </p>
                </div>
            </div>
            """
        })
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False
