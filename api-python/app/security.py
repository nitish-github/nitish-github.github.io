import hashlib
import hmac
import secrets


_PASSWORD_SALT = b"article-app-password-salt"


def hash_password(password: str) -> str:
    return hashlib.scrypt(
        password.encode("utf-8"),
        salt=_PASSWORD_SALT,
        n=2**14,
        r=8,
        p=1,
        dklen=64,
    ).hex()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        expected = bytes.fromhex(password_hash)
    except ValueError:
        return False
    actual = bytes.fromhex(hash_password(password))
    return hmac.compare_digest(expected, actual)


def create_session_token() -> str:
    return secrets.token_hex(32)
