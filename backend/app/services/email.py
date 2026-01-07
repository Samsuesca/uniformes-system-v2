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
                        © 2026 Uniformes. Todos los derechos reservados.
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
                        © 2026 Uniformes. Todos los derechos reservados.
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
                        © 2026 Uniformes. Todos los derechos reservados.
                    </p>
                </div>
            </div>
            """
        })
        return True
    except Exception as e:
        print(f"Error sending password reset email: {e}")
        return False


def send_order_confirmation_email(
    email: str,
    name: str,
    order_code: str,
    html_content: str
) -> bool:
    """
    Send order confirmation email with receipt details.

    Args:
        email: Client email address
        name: Client name
        order_code: Order code (e.g., ENC-2026-0001)
        html_content: Pre-generated HTML content from ReceiptService
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Order confirmation email for {email} - Order #{order_code}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": f"Confirmacion de Encargo #{order_code} - Uniformes",
            "html": html_content
        })
        print(f"Order confirmation email sent to {email} for order #{order_code}")
        return True
    except Exception as e:
        print(f"Error sending order confirmation email: {e}")
        return False


def send_activation_email(email: str, token: str, name: str) -> bool:
    """
    Send account activation email to REGULAR client with token link.
    Token expires in 7 days.
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Activation link for {name} ({email}): {settings.FRONTEND_URL}/activar-cuenta/{token}")
        return True

    try:
        resend.api_key = settings.RESEND_API_KEY

        activation_link = f"{settings.FRONTEND_URL}/activar-cuenta/{token}"

        params = {
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "¡Tu cuenta en Uniformes Consuelo Rios está lista!",
            "html": f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                    <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #1A1A1A 0%, #2D2D2D 100%); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #C9A227; margin: 0; font-size: 28px;">Uniformes Consuelo Rios</h1>
                        </div>

                        <!-- Content -->
                        <div style="padding: 40px 30px; background-color: #f9fafb;">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0;">¡Hola {name}!</h2>

                            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                                Hemos creado una cuenta para ti en nuestro portal web. Ahora puedes consultar el estado de tus pedidos en línea cuando quieras.
                            </p>

                            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 30px 0;">
                                Para activar tu cuenta y elegir una contraseña, haz clic en el botón:
                            </p>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{activation_link}"
                                   style="display: inline-block; background-color: #C9A227; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                    Activar Mi Cuenta
                                </a>
                            </div>

                            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                                Este enlace expira en 7 días. Si no solicitaste esta cuenta, puedes ignorar este mensaje.
                            </p>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #1f2937; padding: 20px; text-align: center;">
                            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                                © 2026 Uniformes Consuelo Rios. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            """
        }

        resend.Emails.send(params)
        print(f"✅ Activation email sent to {email}")
        return True

    except Exception as e:
        print(f"❌ Error sending activation email to {email}: {e}")
        return False
