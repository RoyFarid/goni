from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance — imported by main.py (to wire the exception handler)
# and by any router that needs to throttle a specific endpoint (e.g. login).
limiter = Limiter(key_func=get_remote_address)
