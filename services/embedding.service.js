/**
 * EMBEDDING SERVICE
 * ==================
 * Model: Xenova/all-MiniLM-L6-v2
 *   - This is a JS/ONNX port (via @xenova/transformers) of the well-known
 *     sentence-transformers/all-MiniLM-L6-v2 model.
 * Vector dimension: 384
 * Why this model:
 *   - Runs 100% locally inside the Node.js process (ONNX runtime under the
 *     hood) -- no Python backend, no external embeddings API, no extra
 *     API key to configure. Groq does not provide an embeddings endpoint,
 *     so this keeps the whole stack to "Node.js + Express" as required.
 *   - Small (~90MB), fast on CPU, and good enough quality for short
 *     profile/query text -- appropriate for a 5-day project that must be
 *     reliably demonstrable without depending on a flaky third-party API
 *     during a live demo.
 * Configuration:
 *   - EMBEDDING_DIMENSION=384 in .env must match this model's output size
 *     and the Qdrant collection's vector size (see config/qdrant.js).
 *   - Model weights are downloaded once from the Hugging Face Hub on first
 *     use and cached locally afterwards (no network needed on later runs).
 */

let embedderPromise = null;

async function getEmbedder() {
  if (!embedderPromise) {
    // Lazy import: @xenova/transformers is ESM-only, use dynamic import from CJS.
    embedderPromise = import('@xenova/transformers').then(({ pipeline }) =>
      pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
    );
  }
  return embedderPromise;
}

/**
 * Generates a 384-dim embedding vector for a piece of text.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function generateEmbedding(text) {
  const extractor = await getEmbedder();
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

module.exports = { generateEmbedding };
