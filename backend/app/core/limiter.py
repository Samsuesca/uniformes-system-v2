"""
Rate Limiter Configuration
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Rate limiter global - usa memoria en desarrollo
# En produccion se puede configurar Redis como backend
limiter = Limiter(key_func=get_remote_address)
