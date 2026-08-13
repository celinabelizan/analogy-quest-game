const JPEG = [0xff, 0xd8, 0xff];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46];

function starts(bytes: Uint8Array, magic: number[]) {
  return magic.every((value, index) => bytes[index] === value);
}

function pngSize(bytes: Uint8Array) {
  if (bytes.length < 24) throw new Error("Invalid PNG");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function webpSize(bytes: Uint8Array) {
  if (bytes.length < 30 || new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP")
    throw new Error("Invalid WebP");
  const kind = new TextDecoder().decode(bytes.slice(12, 16));
  if (kind === "VP8X") {
    const read24 = (at: number) => bytes[at]! | (bytes[at + 1]! << 8) | (bytes[at + 2]! << 16);
    return { width: read24(24) + 1, height: read24(27) + 1 };
  }
  if (kind === "VP8 ") {
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) {
      throw new Error("Invalid lossy WebP frame");
    }
    return {
      width: (bytes[26]! | (bytes[27]! << 8)) & 0x3fff,
      height: (bytes[28]! | (bytes[29]! << 8)) & 0x3fff,
    };
  }
  if (kind === "VP8L") {
    if (bytes[20] !== 0x2f) throw new Error("Invalid lossless WebP frame");
    const bits = bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  throw new Error("Unsupported WebP frame");
}

function jpegSize(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error("Invalid JPEG");
    const marker = bytes[offset + 1]!;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2 || offset + length + 2 > bytes.length) throw new Error("Invalid JPEG segment");
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
        marker,
      )
    ) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
      };
    }
    offset += length + 2;
  }
  throw new Error("JPEG dimensions not found");
}

export function inspectImage(bytes: Uint8Array, claimed: string) {
  let mime: "image/jpeg" | "image/png" | "image/webp";
  let size: { width: number; height: number };
  if (starts(bytes, JPEG)) {
    mime = "image/jpeg";
    size = jpegSize(bytes);
  } else if (starts(bytes, PNG)) {
    mime = "image/png";
    size = pngSize(bytes);
  } else if (starts(bytes, WEBP)) {
    mime = "image/webp";
    size = webpSize(bytes);
  } else throw new Error("Unsupported or spoofed image");
  if (claimed !== mime) throw new Error("MIME type does not match file bytes");
  if (size.width < 1 || size.height < 1 || size.width > 4096 || size.height > 4096)
    throw new Error("Image dimensions exceed 4096×4096");
  if (size.width * size.height > 16_777_216) throw new Error("Decoded image is too large");
  return { mime, ...size };
}

export async function sha256Hex(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
