"""
Unit Tests for Email Service.

Tests cover:
- Verification email sending
- Welcome email sending
- Order confirmation emails
- Error handling
- Dev mode (no API key)
"""
import pytest
from unittest.mock import patch, MagicMock

from app.services.email import (
    send_verification_email,
    send_welcome_email
)


pytestmark = pytest.mark.unit


# ============================================================================
# VERIFICATION EMAIL TESTS
# ============================================================================

class TestSendVerificationEmail:
    """Tests for send_verification_email function."""

    def test_dev_mode_returns_true(self):
        """Should return True in dev mode (no API key)."""
        with patch('app.services.email.settings') as mock_settings:
            mock_settings.RESEND_API_KEY = None

            result = send_verification_email(
                email="test@example.com",
                code="123456",
                name="Test User"
            )

            assert result is True

    def test_sends_email_with_api_key(self):
        """Should send email when API key is configured."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            result = send_verification_email(
                email="test@example.com",
                code="123456",
                name="Test User"
            )

            assert result is True
            mock_resend.Emails.send.assert_called_once()

    def test_includes_verification_code_in_email(self):
        """Should include verification code in email body."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_verification_email(
                email="test@example.com",
                code="654321",
                name="María"
            )

            # Check the email was sent with correct code
            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]
            assert "654321" in email_data["html"]
            assert "María" in email_data["html"]

    def test_returns_false_on_error(self):
        """Should return False when sending fails."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock(
                side_effect=Exception("API Error")
            )

            result = send_verification_email(
                email="test@example.com",
                code="123456"
            )

            assert result is False

    def test_uses_default_name_if_not_provided(self):
        """Should use default name 'Usuario' if not provided."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_verification_email(
                email="test@example.com",
                code="123456"
                # No name provided - should use default
            )

            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]
            assert "Usuario" in email_data["html"]


# ============================================================================
# WELCOME EMAIL TESTS
# ============================================================================

class TestSendWelcomeEmail:
    """Tests for send_welcome_email function."""

    def test_dev_mode_returns_true(self):
        """Should return True in dev mode (no API key)."""
        with patch('app.services.email.settings') as mock_settings:
            mock_settings.RESEND_API_KEY = None

            result = send_welcome_email(
                email="test@example.com",
                name="Test User"
            )

            assert result is True

    def test_sends_welcome_email_with_api_key(self):
        """Should send welcome email when API key is configured."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"
            mock_settings.FRONTEND_URL = "https://uniformes.com"

            mock_resend.Emails.send = MagicMock()

            result = send_welcome_email(
                email="test@example.com",
                name="María García"
            )

            assert result is True
            mock_resend.Emails.send.assert_called_once()

    def test_includes_user_name_in_email(self):
        """Should include user name in welcome email."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"
            mock_settings.FRONTEND_URL = "https://uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_welcome_email(
                email="test@example.com",
                name="Carlos López"
            )

            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]
            assert "Carlos López" in email_data["html"]

    def test_has_correct_subject(self):
        """Should have welcome subject."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"
            mock_settings.FRONTEND_URL = "https://uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_welcome_email(
                email="test@example.com",
                name="Test"
            )

            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]
            assert "Bienvenido" in email_data["subject"]

    def test_returns_false_on_error(self):
        """Should return False when sending fails."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"
            mock_settings.FRONTEND_URL = "https://uniformes.com"

            mock_resend.Emails.send = MagicMock(
                side_effect=Exception("API Error")
            )

            result = send_welcome_email(
                email="test@example.com",
                name="Test"
            )

            assert result is False


# ============================================================================
# EMAIL FORMAT TESTS
# ============================================================================

class TestEmailFormat:
    """Tests for email formatting."""

    def test_verification_email_has_html_structure(self):
        """Verification email should have proper HTML structure."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_verification_email(
                email="test@example.com",
                code="123456"
            )

            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]

            # Check for expected HTML elements
            assert "<div" in email_data["html"]
            assert "style=" in email_data["html"]
            assert "Uniformes" in email_data["html"]

    def test_verification_email_mentions_expiration(self):
        """Verification email should mention code expiration."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            send_verification_email(
                email="test@example.com",
                code="123456"
            )

            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]

            assert "10 minutos" in email_data["html"] or "expira" in email_data["html"].lower()


# ============================================================================
# EDGE CASES
# ============================================================================

class TestEdgeCases:
    """Tests for edge cases."""

    def test_empty_email_address(self):
        """Should handle empty email address gracefully."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock(
                side_effect=Exception("Invalid email")
            )

            result = send_verification_email(
                email="",
                code="123456"
            )

            assert result is False

    def test_special_characters_in_name(self):
        """Should handle special characters in name."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            result = send_verification_email(
                email="test@example.com",
                code="123456",
                name="José María O'Connor"
            )

            assert result is True
            call_args = mock_resend.Emails.send.call_args
            email_data = call_args[0][0]
            assert "José María O'Connor" in email_data["html"]

    def test_unicode_in_name(self):
        """Should handle unicode characters in name."""
        with patch('app.services.email.settings') as mock_settings, \
             patch('app.services.email.resend') as mock_resend:
            mock_settings.RESEND_API_KEY = "test_api_key"
            mock_settings.EMAIL_FROM = "test@uniformes.com"

            mock_resend.Emails.send = MagicMock()

            result = send_verification_email(
                email="test@example.com",
                code="123456",
                name="北京用户"
            )

            assert result is True
