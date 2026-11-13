// A small .zip reader for the browser: lists the files and unpacks the ones asked for, reading only
// those parts of the file (Instagram downloads can be large). Unpacking uses the browser's own
// DecompressionStream, so nothing is uploaded and no library is needed.

export type ZipEntry = { name: string; method: number; compressedSize: number; size: number; offset: number };

const SIG_EOCD = 0x06054b50;
const SIG_EOCD64 = 0x06064b50;
const SIG_EOCD64_LOCATOR = 0x07064b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

async function bytes(file: Blob, start: number, end: number): Promise<DataView> {
  return new DataView(await file.slice(start, end).arrayBuffer());
}

const u64 = (v: DataView, at: number) => Number(v.getBigUint64(at, true));

/** Every file in the zip (folders left out). Throws when it isn't a zip. */
export async function listZip(file: Blob): Promise<ZipEntry[]> {
  // The end-of-directory record is in the last 64 KB (plus its own 22 bytes).
  const tailStart = Math.max(0, file.size - 65_557);
  const tail = await bytes(file, tailStart, file.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This doesn't look like a .zip file.");
  let count = tail.getUint16(eocd + 10, true);
  let dirSize = tail.getUint32(eocd + 12, true);
  let dirOffset = tail.getUint32(eocd + 16, true);

  // Zip64 (big downloads): the real numbers are in a separate record.
  if (eocd >= 20 && tail.getUint32(eocd - 20, true) === SIG_EOCD64_LOCATOR) {
    const at = u64(tail, eocd - 20 + 8);
    const z64 = await bytes(file, at, at + 56);
    if (z64.getUint32(0, true) === SIG_EOCD64) {
      count = u64(z64, 32);
      dirSize = u64(z64, 40);
      dirOffset = u64(z64, 48);
    }
  }

  const dir = await bytes(file, dirOffset, dirOffset + dirSize);
  const entries: ZipEntry[] = [];
  const decoder = new TextDecoder();
  let p = 0;
  for (let n = 0; n < count && p + 46 <= dir.byteLength; n++) {
    if (dir.getUint32(p, true) !== SIG_CENTRAL) break;
    const method = dir.getUint16(p + 10, true);
    let compressedSize = dir.getUint32(p + 20, true);
    let size = dir.getUint32(p + 24, true);
    const nameLen = dir.getUint16(p + 28, true);
    const extraLen = dir.getUint16(p + 30, true);
    const commentLen = dir.getUint16(p + 32, true);
    let offset = dir.getUint32(p + 42, true);
    const name = decoder.decode(new Uint8Array(dir.buffer, dir.byteOffset + p + 46, nameLen));

    // Zip64 sizes and offset live in the "extra" field when the 32-bit ones are full.
    let e = p + 46 + nameLen;
    const extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      const id = dir.getUint16(e, true);
      const len = dir.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) {
          size = u64(dir, q);
          q += 8;
        }
        if (compressedSize === 0xffffffff) {
          compressedSize = u64(dir, q);
          q += 8;
        }
        if (offset === 0xffffffff) offset = u64(dir, q);
      }
      e += 4 + len;
    }
    if (!name.endsWith("/")) entries.push({ name, method, compressedSize, size, offset });
    p = extraEnd + commentLen;
  }
  return entries;
}

/** One file's contents as text. Only "stored" and "deflate" files (what Instagram uses). */
export async function readZipText(file: Blob, entry: ZipEntry): Promise<string> {
  const head = await bytes(file, entry.offset, entry.offset + 30);
  if (head.getUint32(0, true) !== SIG_LOCAL) throw new Error(`Can't read ${entry.name}.`);
  const start = entry.offset + 30 + head.getUint16(26, true) + head.getUint16(28, true);
  const data = file.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return data.text();
  if (entry.method !== 8) throw new Error(`Unsupported compression in ${entry.name}.`);
  const stream = data.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).text();
}
