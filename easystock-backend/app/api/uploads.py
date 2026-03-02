from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.dependencies import get_company_user
from app.models.user import User

router = APIRouter()


@router.post("/image")
def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_company_user),
) -> dict:
    # Auth required (current_user unused, but enforces business scoping/security)
    _ = current_user

    content_type = (file.content_type or "").lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only image uploads are supported")

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
        if len(ext) > 10:
            ext = ""

    uploads_dir = os.path.join(os.path.dirname(__file__), "..", "static", "uploads")
    uploads_dir = os.path.abspath(uploads_dir)
    os.makedirs(uploads_dir, exist_ok=True)

    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(uploads_dir, name)

    data = file.file.read()
    with open(path, "wb") as f:
        f.write(data)

    # Served via StaticFiles mounted at /static
    url_path = f"/static/uploads/{name}"
    return {"url": url_path}
