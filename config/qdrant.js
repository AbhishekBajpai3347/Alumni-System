const { QdrantClient } = require('@qdrant/js-client-rest');

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;

const client = new QdrantClient({
  url: QDRANT_URL,
  apiKey: QDRANT_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'alumni_profiles';
const VECTOR_SIZE = parseInt(process.env.EMBEDDING_DIMENSION || '384', 10);

/**
 * Ensures the alumni collection exists with the correct vector size/distance.
 * Safe to call on every server start (idempotent).
 */
async function ensureCollection() {
  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
      });
      console.log(`[qdrant] Created collection "${COLLECTION_NAME}" (dim=${VECTOR_SIZE}, distance=Cosine)`);
    } else {
      console.log(`[qdrant] Collection "${COLLECTION_NAME}" already exists.`);
    }
  } catch (err) {
    console.error('[qdrant] Could not connect / ensure collection. AI Finder semantic search will be degraded.');
    console.error('[qdrant] Reason:', err.message);
  }
}

module.exports = { client, COLLECTION_NAME, VECTOR_SIZE, ensureCollection };
