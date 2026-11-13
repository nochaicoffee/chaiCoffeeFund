const encoder = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

/**
 * Whether two strings are equal, in time that doesn't depend on where they differ.
 * Both are hashed first, so the comparison always runs over 32 bytes and a wrong guess's
 * length gives nothing away. Web Crypto only, so the proxy can use it too.
 */
export async function safeEqual(a: string, b: string): Promise<boolean> {
  const [x, y] = await Promise.all([digest(a), digest(b)]);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
