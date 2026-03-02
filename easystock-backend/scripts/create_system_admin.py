#!/usr/bin/env python3
"""Create the first system admin. Run: python -m scripts.create_system_admin"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import get_password_hash
from app.database import get_db
from app.models.user import User
from app.models.full_schema import UserRole


def main():
    email = os.environ.get("SYSTEM_ADMIN_EMAIL", "admin@easystock.com")
    password = os.environ.get("SYSTEM_ADMIN_PASSWORD", "Admin123!")
    full_name = os.environ.get("SYSTEM_ADMIN_NAME", "System Admin")

    db = next(get_db())
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.role == UserRole.SYSTEM_ADMIN:
            print(f"System admin already exists: {email}")
        else:
            print(f"User {email} exists but is not system admin. Update manually.")
        return

    user = User(
        business_id=None,
        email=email,
        full_name=full_name,
        password_hash=get_password_hash(password),
        role=UserRole.SYSTEM_ADMIN,
    )
    db.add(user)
    db.commit()
    print(f"System admin created: {email}")


if __name__ == "__main__":
    main()
