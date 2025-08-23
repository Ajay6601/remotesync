import CryptoJS from 'crypto-js';

class EncryptionService {
  private userKey: string | null = null;

  setUserKey(password: string, salt: string): void {
    // Derive key from password and salt using PBKDF2
    this.userKey = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 100000
    }).toString();
  }

  encryptMessage(message: string): string | null {
    if (!this.userKey) return null;
    
    try {
      const encrypted = CryptoJS.AES.encrypt(message, this.userKey).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }

  decryptMessage(encryptedMessage: string): string | null {
    if (!this.userKey) return null;
    
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, this.userKey);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  generateKeyPair(): { publicKey: string; privateKey: string } {
    // Simplified key generation for demo - in production use proper asymmetric encryption
    const privateKey = CryptoJS.lib.WordArray.random(256/8).toString();
    const publicKey = CryptoJS.SHA256(privateKey).toString();
    
    return { publicKey, privateKey };
  }

  clearKeys(): void {
    this.userKey = null;
  }
}

export const encryptionService = new EncryptionService();