import { pipeline } from '@xenova/transformers';

type FeatureExtractionPipeline = ReturnType<Awaited<ReturnType<typeof pipeline>>>;

let _pipe: Awaited<FeatureExtractionPipeline> | null = null; // actually it's a Promise-wrapped pipe

async function getPipe(): Promise<any> {
  if (!_pipe) {
    console.log('[embeddings] Loading model (first call — this may take a moment)...');
    _pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[embeddings] Model loaded.');
  }
  return _pipe;
}

/**
 * Generate a 384-dimensional embedding vector for arbitrary text.
 * Returns a Float32Array suitable for sqlite-vec BLOB storage.
 */
export async function generateEmbedding(text: string): Promise<Float32Array> {
  const pipe = await getPipe();
  const result = await pipe(text, { pooling: 'mean', normalize: true });
  return new Float32Array(result.tolist()[0]);
}

/**
 * Serialize a Float32Array to a Buffer for SQLite BLOB storage.
 * sqlite-vec stores vectors as raw float32 bytes (little-endian).
 */
export function vectorToBlob(vec: Float32Array): Buffer {
  return Buffer.from(vec.buffer);
}

/**
 * Deserialize a Buffer back to Float32Array.
 */
export function blobToVector(blob: Buffer): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, blob.byteLength / 4);
}

/**
 * Compute cosine similarity between two Float32Arrays.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
