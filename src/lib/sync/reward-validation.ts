type ImageMetadata = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  magicBytes: Uint8Array;
};

export function validateProductUrl(value: string): string {
  // Control characters can create ambiguous link rendering/parsing.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value))
    throw new Error("Product URL contains control characters");
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password)
    throw new Error("Only credential-free HTTP(S) links are allowed");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "::1" ||
    /^127\.|^10\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)
  )
    throw new Error("Private/local addresses are not allowed");
  return url.toString();
}

export function validateRewardImageMetadata<T extends ImageMetadata>(metadata: T): T {
  const signatures: Record<string, number[]> = {
    "image/jpeg": [0xff, 0xd8, 0xff],
    "image/png": [0x89, 0x50, 0x4e, 0x47],
    "image/webp": [0x52, 0x49, 0x46, 0x46],
  };
  const signature = signatures[metadata.mimeType];
  if (!signature || !signature.every((byte, index) => metadata.magicBytes[index] === byte))
    throw new Error("Unsupported or mismatched image type");
  if (metadata.sizeBytes < 1 || metadata.sizeBytes > 5 * 1024 * 1024)
    throw new Error("Image exceeds 5 MB");
  if (
    metadata.width < 1 ||
    metadata.height < 1 ||
    metadata.width > 4096 ||
    metadata.height > 4096 ||
    metadata.width * metadata.height > 16_777_216
  )
    throw new Error("Image dimensions are unsafe");
  return metadata;
}
