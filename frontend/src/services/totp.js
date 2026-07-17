// totp.js - Web Crypto based TOTP generator and validator
// Compatible with Google Authenticator

/**
 * Decodes a Base32 string to a Uint8Array.
 * @param {string} base32 - The Base32 string to decode.
 * @returns {Uint8Array} The decoded byte array.
 */
export function base32ToBytes(base32) {
  const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  // Clean base32 string (remove padding, spaces and convert to uppercase)
  const clean = base32.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = base32chars.indexOf(clean.charAt(i));
    if (val === -1) {
      throw new Error(`Invalid Base32 character: ${clean.charAt(i)}`);
    }
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i * 8) + 8), 2);
  }
  return bytes;
}

/**
 * Converts a time step integer into an 8-byte big-endian Uint8Array.
 * @param {number} time - The integer timestamp.
 * @returns {Uint8Array} The 8-byte array.
 */
function timeToBytes(time) {
  const bytes = new Uint8Array(8);
  let temp = time;
  for (let i = 7; i >= 0; i--) {
    bytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }
  return bytes;
}

/**
 * Generates a random 16-character Base32 secret key.
 * @returns {string} The Base32 key.
 */
export function generateSecret() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  // Web Crypto secure random values
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < 16; i++) {
    secret += chars.charAt(array[i] % chars.length);
  }
  return secret;
}

/**
 * Generates a TOTP (Time-based One-Time Password) code for a given secret.
 * @param {string} secret - The Base32 secret key.
 * @param {number} [epoch=Date.now()] - The current epoch time in milliseconds.
 * @returns {Promise<string>} A 6-digit TOTP string.
 */
export async function generateTOTP(secret, epoch = Date.now()) {
  try {
    const keyBytes = base32ToBytes(secret);
    const time = Math.floor(epoch / 1000 / 30);
    const timeBytes = timeToBytes(time);

    // Import the secret key for HMAC-SHA-1
    const cryptoKey = await window.crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: { name: "SHA-1" } },
      false,
      ["sign"]
    );

    // Sign the time step bytes with HMAC-SHA-1
    const signature = await window.crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      timeBytes
    );

    const hmac = new Uint8Array(signature);
    
    // Dynamic Truncation (RFC 6238 / RFC 4226)
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = binary % 1000000;
    return otp.toString().padStart(6, "0");
  } catch (error) {
    console.error("TOTP generation error:", error);
    throw error;
  }
}

/**
 * Verifies a 6-digit TOTP token against a secret key, permitting minor clock skew.
 * @param {string} token - The user input 6-digit string.
 * @param {string} secret - The Base32 secret key.
 * @returns {Promise<boolean>} True if valid, false otherwise.
 */
export async function verifyTOTP(token, secret) {
  if (!token || typeof token !== "string" || !/^\d{6}$/.test(token)) {
    return false;
  }
  
  const now = Date.now();
  
  // Verify with a drift window of -30s, 0s, +30s to account for slight clock offsets
  for (let i = -1; i <= 1; i++) {
    try {
      const computed = await generateTOTP(secret, now + i * 30000);
      if (computed === token) {
        return true;
      }
    } catch {
      // Ignore errors in a specific window, try others
    }
  }
  return false;
}
