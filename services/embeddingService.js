const crypto = require("crypto");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const getApiKey = () => process.env.GEMINI_API_KEY?.trim();
const getEmbeddingModelName = () => process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

const hasUsableApiKey = () => {
    const key = getApiKey();
    return Boolean(key && key !== "your_gemini_api_key_here");
};

const createEmbeddingError = (statusCode, message, cause) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (cause) error.cause = cause;
    return error;
};

const listingToEmbeddingText = (listing) => [
    `Title: ${listing.title || ""}`,
    `Description: ${listing.description || ""}`,
    `Location: ${listing.location || ""}, ${listing.country || ""}`,
    `Category: ${listing.category || ""}`,
    `Amenities: ${(listing.amenities || []).join(", ")}`,
    `Price per night: ${listing.price || ""}`,
    `Rating: ${listing.rating || ""}`,
].join("\n");

const getContentHash = (text) => crypto.createHash("sha256").update(text).digest("hex");

async function embedText(text) {
    if (!hasUsableApiKey()) {
        throw createEmbeddingError(503, "Semantic search is not configured yet. Add GEMINI_API_KEY to your local .env file.");
    }

    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({ model: getEmbeddingModelName() });

    try {
        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        if (error.status === 401 || error.status === 403) {
            throw createEmbeddingError(502, "Gemini rejected the configured API key for embeddings.", error);
        }
        throw createEmbeddingError(502, "The embedding service is temporarily unavailable. Please try again.", error);
    }
}

module.exports = {
    getEmbeddingModelName,
    listingToEmbeddingText,
    getContentHash,
    embedText,
};
