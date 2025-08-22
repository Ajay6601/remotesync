from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class EncryptionService:
    def __init__(self):
        self.salt = os.urandom(16)
    
    def derive_key(self, password: str, salt: bytes = None) -> bytes:
        if salt is None:
            salt = self.salt
            
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password.encode()))
    
    def encrypt_message(self, message: str, key: bytes) -> str:
        f = Fernet(key)
        encrypted_message = f.encrypt(message.encode())
        return base64.b64encode(encrypted_message).decode()
    
    def decrypt_message(self, encrypted_message: str, key: bytes) -> str:
        f = Fernet(key)
        decrypted_message = f.decrypt(base64.b64decode(encrypted_message))
        return decrypted_message.decode()