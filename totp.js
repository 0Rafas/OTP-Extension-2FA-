// totp.js - TOTP generation library

class TOTP {
  static base32Decode(base32) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    let value = 0;
    let output = [];
    
    base32 = base32.replace(/=+$/, '').toUpperCase();
    
    for (let i = 0; i < base32.length; i++) {
      const char = base32[i];
      const index = alphabet.indexOf(char);
      if (index === -1) throw new Error('Invalid base32 character');
      
      bits += index.toString(2).padStart(5, '0');
    }
    
    for (let i = 0; i < bits.length; i += 8) {
      if (i + 8 <= bits.length) {
        output.push(parseInt(bits.substr(i, 8), 2));
      }
    }
    
    return new Uint8Array(output);
  }
  
  static async hmacSha1(key, data) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
    return new Uint8Array(signature);
  }
  
  static dynamicTruncate(hash) {
    const offset = hash[hash.length - 1] & 0x0f;
    const code = ((hash[offset] & 0x7f) << 24) |
                 ((hash[offset + 1] & 0xff) << 16) |
                 ((hash[offset + 2] & 0xff) << 8) |
                 (hash[offset + 3] & 0xff);
    return code;
  }
  
  static async generate(secret, timeStep = 30, digits = 6) {
    try {
      const key = this.base32Decode(secret);
      const time = Math.floor(Date.now() / 1000 / timeStep);
      
      const timeBuffer = new ArrayBuffer(8);
      const timeView = new DataView(timeBuffer);
      timeView.setUint32(4, time, false);
      
      const hash = await this.hmacSha1(key, new Uint8Array(timeBuffer));
      const code = this.dynamicTruncate(hash);
      
      return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
    } catch (error) {
      throw new Error('فشل في توليد رمز OTP: ' + error.message);
    }
  }
  
  static getTimeRemaining(timeStep = 30) {
    const now = Math.floor(Date.now() / 1000);
    return timeStep - (now % timeStep);
  }
}

