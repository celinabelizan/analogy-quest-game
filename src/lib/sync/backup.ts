const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer),
  );
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type EncryptedBackup = {
  blob: Blob;
  recoveryKey: string;
  ciphertextSha256: string;
  retainUntil: string;
};

export async function encryptBackup(plaintext: string): Promise<EncryptedBackup> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(plaintext)),
  );
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const envelope = encoder.encode(
    JSON.stringify({
      version: 1,
      algorithm: "AES-256-GCM",
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertext),
    }),
  );
  const retainUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    blob: new Blob([envelope], { type: "application/octet-stream" }),
    recoveryKey: bytesToBase64(rawKey),
    ciphertextSha256: await sha256Hex(envelope),
    retainUntil,
  };
}

export async function decryptBackup(blob: Blob, recoveryKey: string): Promise<string> {
  const parsed = JSON.parse(await blob.text()) as {
    version: number;
    iv: string;
    ciphertext: string;
  };
  if (parsed.version !== 1) throw new Error("Unsupported backup format");
  const key = await crypto.subtle.importKey("raw", base64ToBytes(recoveryKey), "AES-GCM", false, [
    "decrypt",
  ]);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(parsed.iv) },
    key,
    base64ToBytes(parsed.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}
