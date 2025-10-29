import crypto from 'crypto';

export class WhatsAppDecrypt {
  static decryptMedia(encryptedData: Buffer, mediaKey: string, mediaType: string): Buffer | null {
    try {
      console.log(`🔓 Decrypting WhatsApp media with mediaKey for ${mediaType}`);
      
      // פענוח base64 mediaKey
      const mediaKeyBuffer = Buffer.from(mediaKey, 'base64');
      console.log(`MediaKey buffer length: ${mediaKeyBuffer.length}`);

      // קבלת מפתחות פענוח באמצעות HKDF
      const keys = this.deriveKeys(mediaKeyBuffer, mediaType);
      console.log(`Derived keys length: ${keys.length}`);

      // חילוץ IV ומפתח הצפנה
      const iv = keys.slice(0, 16);
      const cipherKey = keys.slice(16, 48);

      // הסרת 10 בתים אחרונים (MAC hash)
      const ciphertext = encryptedData.slice(0, -10);
      console.log(`Ciphertext length: ${ciphertext.length}`);

      // פענוח באמצעות AES-256-CBC
      const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      console.log(`✅ Media decrypted successfully: ${decrypted.length} bytes`);
      return decrypted;
    } catch (error: any) {
      console.error(`❌ Failed to decrypt media: ${error.message}`);
      return null;
    }
  }

  private static deriveKeys(mediaKey: Buffer, mediaType: string): Buffer {
    const infoMap: Record<string, string> = {
      image: 'WhatsApp Image Keys',
      video: 'WhatsApp Video Keys',
      audio: 'WhatsApp Audio Keys',
      document: 'WhatsApp Document Keys',
    };

    const info = infoMap[mediaType] || 'WhatsApp Audio Keys';
    console.log(`Using info string: ${info}`);

    // HKDF: Extract + Expand to 112 bytes
    const prk = crypto.createHmac('sha256', Buffer.alloc(32)).update(mediaKey).digest();

    const length = 112;
    const n = Math.ceil(length / 32);
    let t = Buffer.alloc(0);
    const result: Buffer[] = [];

    for (let i = 1; i <= n; i++) {
      const h = crypto
        .createHmac('sha256', prk)
        .update(Buffer.concat([t, Buffer.from(info), Buffer.from([i])]))
        .digest();
      t = Buffer.from(h);
      result.push(t);
    }

    return Buffer.concat(result).slice(0, length);
  }
}


