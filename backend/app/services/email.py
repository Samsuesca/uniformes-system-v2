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


def send_sale_confirmation_email(
    email: str,
    name: str,
    sale_code: str,
    html_content: str
) -> bool:
    """
    Send sale confirmation email with receipt details.

    Args:
        email: Client email address
        name: Client name
        sale_code: Sale code (e.g., VNT-2026-0001)
        html_content: Pre-generated HTML content from ReceiptService
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Sale confirmation email for {email} - Sale #{sale_code}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": f"Recibo de Venta #{sale_code} - Uniformes",
            "html": html_content
        })
        print(f"Sale confirmation email sent to {email} for sale #{sale_code}")
        return True
    except Exception as e:
        print(f"Error sending sale confirmation email: {e}")
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


def send_order_ready_email(
    email: str,
    name: str,
    order_code: str,
    school_name: str = ""
) -> bool:
    """
    Send email to client when their order is ready for pickup.

    Args:
        email: Client email address
        name: Client name
        order_code: Order code (e.g., ENC-2026-0001)
        school_name: School name for context (optional)
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Order ready email for {email} - Order #{order_code}")
        return True

    resend.api_key = settings.RESEND_API_KEY

    try:
        school_text = f" del colegio {school_name}" if school_name else ""
        portal_url = "https://uniformesconsuelorios.com"

        resend.Emails.send({
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": f"¡Tu pedido {order_code} está listo! - Uniformes Consuelo Rios",
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
                            <div style="text-align: center; margin-bottom: 30px;">
                                <span style="font-size: 60px;">🎉</span>
                            </div>

                            <h2 style="color: #1f2937; margin: 0 0 20px 0; text-align: center;">
                                ¡Hola {name}!
                            </h2>

                            <div style="background-color: #d1fae5; border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <p style="color: #065f46; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
                                    ¡Tu pedido está listo para recoger!
                                </p>
                                <p style="color: #047857; font-size: 24px; font-weight: bold; margin: 0; letter-spacing: 2px;">
                                    {order_code}
                                </p>
                                {f'<p style="color: #065f46; font-size: 14px; margin: 10px 0 0 0;">{school_text}</p>' if school_text else ''}
                            </div>

                            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0; text-align: center;">
                                Tu encargo de uniformes{school_text} ya está terminado y listo para que lo recojas en nuestra tienda.
                            </p>

                            <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <p style="color: #92400e; font-weight: bold; margin: 0 0 10px 0;">
                                    📋 Recuerda traer:
                                </p>
                                <ul style="color: #78350f; margin: 0; padding-left: 20px;">
                                    <li>Tu número de pedido: <strong>{order_code}</strong></li>
                                    <li>Documento de identidad</li>
                                    <li>Saldo pendiente (si aplica)</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Contact Info -->
                        <div style="padding: 30px; background-color: #1f2937; color: white;">
                            <h3 style="color: #C9A227; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                                📍 ¿Dónde recogemos?
                            </h3>

                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                                        <span style="font-size: 18px;">🏠</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Dirección:</strong><br>
                                        Calle 56 D #26 BE 04<br>
                                        Villas de San José, Boston - Barrio Sucre<br>
                                        Medellín, Colombia
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top;">
                                        <span style="font-size: 18px;">🕐</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Horario:</strong><br>
                                        Lunes a Viernes: 8:00 AM - 6:00 PM<br>
                                        Sábado: 9:00 AM - 2:00 PM
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top;">
                                        <span style="font-size: 18px;">📞</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>WhatsApp:</strong><br>
                                        <a href="https://wa.me/573105997451" style="color: #C9A227; text-decoration: none;">+57 310 599 7451</a>
                                    </td>
                                </tr>
                            </table>

                            <div style="text-align: center; margin-top: 20px;">
                                <a href="{portal_url}/mis-pedidos"
                                   style="display: inline-block; background-color: #C9A227; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                    Ver Mi Pedido en el Portal
                                </a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="padding: 20px; text-align: center; background-color: #111827;">
                            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                                © 2026 Uniformes Consuelo Rios. Todos los derechos reservados.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            """
        })
        print(f"✅ Order ready email sent to {email} for order #{order_code}")
        return True
    except Exception as e:
        print(f"❌ Error sending order ready email: {e}")
        return False


def send_welcome_with_activation_email(email: str, token: str, name: str, transaction_type: str = "encargo") -> bool:
    """
    Send welcome email on first transaction with activation link and business info.

    This is sent when a client has their first order or sale, not on registration.
    Includes:
    - Personalized welcome
    - Account activation link
    - Instructions for portal access
    - Business contact information

    Args:
        email: Client email address
        token: Activation token for creating password
        name: Client name
        transaction_type: "encargo" or "venta" for personalized message
    """
    if not settings.RESEND_API_KEY:
        print(f"[DEV] Welcome email for {name} ({email}): {settings.FRONTEND_URL}/activar-cuenta/{token}")
        return True

    try:
        resend.api_key = settings.RESEND_API_KEY

        activation_link = f"{settings.FRONTEND_URL}/activar-cuenta/{token}"
        portal_url = "https://uniformesconsuelorios.com"

        params = {
            "from": settings.EMAIL_FROM,
            "to": [email],
            "subject": "¡Bienvenido a Uniformes Consuelo Rios! - Tu cuenta está lista",
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
                            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px;">Calidad y tradición en uniformes escolares</p>
                        </div>

                        <!-- Welcome Content -->
                        <div style="padding: 40px 30px; background-color: #f9fafb;">
                            <h2 style="color: #1f2937; margin: 0 0 20px 0;">¡Bienvenido {name}!</h2>

                            <p style="color: #4b5563; line-height: 1.6; margin: 0 0 20px 0;">
                                Gracias por confiar en nosotros para tu {transaction_type}. Hemos creado una cuenta para ti en nuestro portal web para que puedas:
                            </p>

                            <ul style="color: #4b5563; line-height: 1.8; margin: 0 0 25px 0; padding-left: 20px;">
                                <li>📦 <strong>Consultar el estado de tus pedidos</strong> en tiempo real</li>
                                <li>📋 <strong>Ver el historial</strong> de todas tus compras</li>
                                <li>🛒 <strong>Realizar nuevos pedidos</strong> desde la comodidad de tu hogar</li>
                                <li>📱 <strong>Acceder cuando quieras</strong> desde cualquier dispositivo</li>
                            </ul>

                            <!-- Activation Button -->
                            <div style="background-color: #fff; border: 2px solid #e5e7eb; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <p style="color: #1f2937; font-weight: bold; margin: 0 0 15px 0; font-size: 16px;">
                                    Activa tu cuenta ahora
                                </p>
                                <a href="{activation_link}"
                                   style="display: inline-block; background-color: #C9A227; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                    Crear Mi Contraseña
                                </a>
                                <p style="color: #6b7280; font-size: 12px; margin: 15px 0 0 0;">
                                    Este enlace expira en 7 días
                                </p>
                            </div>

                            <!-- How to use section -->
                            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">📖 ¿Cómo consultar tus pedidos?</h3>
                                <ol style="color: #4b5563; line-height: 1.8; margin: 0; padding-left: 20px;">
                                    <li>Haz clic en "Crear Mi Contraseña" arriba</li>
                                    <li>Elige una contraseña segura</li>
                                    <li>Ingresa a <a href="{portal_url}" style="color: #C9A227;">{portal_url}</a></li>
                                    <li>Usa tu email y contraseña para acceder</li>
                                </ol>
                            </div>
                        </div>

                        <!-- Contact Info -->
                        <div style="padding: 30px; background-color: #1f2937; color: white;">
                            <h3 style="color: #C9A227; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                                📍 Visítanos o Contáctanos
                            </h3>

                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top; width: 30px;">
                                        <span style="font-size: 18px;">📞</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Teléfono / WhatsApp:</strong><br>
                                        <a href="https://wa.me/573105997451" style="color: #C9A227; text-decoration: none;">+57 310 599 7451</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top;">
                                        <span style="font-size: 18px;">📧</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Email:</strong><br>
                                        <a href="mailto:uniformesconsuelorios@gmail.com" style="color: #C9A227; text-decoration: none;">uniformesconsuelorios@gmail.com</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top;">
                                        <span style="font-size: 18px;">🏠</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Dirección:</strong><br>
                                        Calle 56 D #26 BE 04<br>
                                        Villas de San José, Boston - Barrio Sucre<br>
                                        Medellín, Colombia
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; vertical-align: top;">
                                        <span style="font-size: 18px;">🕐</span>
                                    </td>
                                    <td style="padding: 8px 0; color: #e5e7eb;">
                                        <strong>Horario:</strong><br>
                                        Lunes a Viernes: 8:00 AM - 6:00 PM<br>
                                        Sábado: 9:00 AM - 2:00 PM
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Footer -->
                        <div style="padding: 20px; text-align: center; background-color: #111827;">
                            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px;">
                                Si no realizaste esta compra, puedes ignorar este mensaje.
                            </p>
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
        print(f"✅ Welcome email with activation sent to {email}")
        return True

    except Exception as e:
        print(f"❌ Error sending welcome email to {email}: {e}")
        return False
