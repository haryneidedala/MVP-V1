# requirements:
# flask flask-cors pyjwt python-dotenv passlib (optional) gunicorn (prod)

import os, time, uuid
from datetime import timedelta
from typing import Optional

import jwt
from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app,
     resources={r"/api/*": {"origins": ["https://mydomain.com"]}},
     supports_credentials=True,
     allow_headers=["Authorization", "Content-Type"])

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me")
JWT_ISSUER = "my-flask-api"
ACCESS_TTL = 15 * 60          # 15 minutes
REFRESH_TTL = 14 * 24 * 3600  # 14 days

# --- demo "database"
USERS = {}          # email -> {"id": ..., "email": ..., "pwd_hash": ...}
REFRESH_STORE = {}  # refresh_jti -> {"user_id": ..., "exp": ...}  (for rotation/revocation)

def create_jwt(sub: str, kind: str, ttl: int, extra: Optional[dict] = None):
    now = int(time.time())
    jti = str(uuid.uuid4())
    payload = {
        "iss": JWT_ISSUER,
        "sub": sub,
        "iat": now,
        "exp": now + ttl,
        "jti": jti,
        "typ": kind,
        **(extra or {})
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    return token, payload

def verify_jwt(token: str, expected_typ: str):
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], options={"require": ["exp", "iat", "sub", "typ"]})
    if payload.get("typ") != expected_typ:
        raise jwt.InvalidTokenError("Wrong token type")
    return payload

def set_refresh_cookie(resp, token: str):
    # For cross-site calls from https://mydomain.com to https://api.mydomain.com
    # you likely need SameSite=None; Secure; HttpOnly
    resp.set_cookie(
        "refresh_token", token,
        max_age=REFRESH_TTL,
        httponly=True,
        secure=True,
        samesite="None"
    )

def clear_refresh_cookie(resp):
    resp.set_cookie("refresh_token", "", max_age=0, httponly=True, secure=True, samesite="None")

# --- Auth routes
@app.post("/api/auth/register")
def register():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    if email in USERS:
        return jsonify({"error": "email already registered"}), 409

    pwd_hash = generate_password_hash(password, method="pbkdf2:sha256", salt_length=16)
    user_id = str(uuid.uuid4())
    USERS[email] = {"id": user_id, "email": email, "pwd_hash": pwd_hash}
    return jsonify({"ok": True})

@app.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = USERS.get(email)
    if not user or not check_password_hash(user["pwd_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401

    access, access_payload = create_jwt(user["id"], "access", ACCESS_TTL)
    refresh, refresh_payload = create_jwt(user["id"], "refresh", REFRESH_TTL)

    # store refresh jti so we can rotate/revoke later
    REFRESH_STORE[refresh_payload["jti"]] = {"user_id": user["id"], "exp": refresh_payload["exp"]}

    resp = make_response({"access_token": access, "user_id": user["id"]})
    set_refresh_cookie(resp, refresh)
    return resp

@app.post("/api/auth/refresh")
def refresh():
    token = request.cookies.get("refresh_token")
    if not token:
        return jsonify({"error": "no refresh token"}), 401

    try:
        payload = verify_jwt(token, "refresh")
    except jwt.PyJWTError as e:
        return jsonify({"error": str(e)}), 401

    jti = payload["jti"]
    info = REFRESH_STORE.get(jti)
    if not info or info["user_id"] != payload["sub"]:
        return jsonify({"error": "refresh revoked"}), 401

    # Rotate: revoke old, issue new refresh
    del REFRESH_STORE[jti]
    new_access, _ = create_jwt(payload["sub"], "access", ACCESS_TTL)
    new_refresh, new_rp = create_jwt(payload["sub"], "refresh", REFRESH_TTL)
    REFRESH_STORE[new_rp["jti"]] = {"user_id": payload["sub"], "exp": new_rp["exp"]}

    resp = make_response({"access_token": new_access})
    set_refresh_cookie(resp, new_refresh)
    return resp

@app.post("/api/auth/logout")
def logout():
    token = request.cookies.get("refresh_token")
    if token:
        try:
            payload = verify_jwt(token, "refresh")
            REFRESH_STORE.pop(payload.get("jti"), None)
        except jwt.PyJWTError:
            pass
    resp = make_response({"ok": True})
    clear_refresh_cookie(resp)
    return resp

# --- Protect endpoints
def require_access(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "missing bearer token"}), 401
        token = auth[7:]
        try:
            payload = verify_jwt(token, "access")
        except jwt.PyJWTError as e:
            return jsonify({"error": str(e)}), 401
        request.user_id = payload["sub"]
        return fn(*args, **kwargs)
    return wrapper

@app.get("/api/private")
@require_access
def private():
    return {"message": "Hello!", "user_id": request.user_id}