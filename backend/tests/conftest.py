import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ["NEXUS_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["NEXUS_SECRET_KEY"] = "test-secret-key-that-is-long-enough-0123456789"
