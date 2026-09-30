const Listing = require("../models/listing.js");
const ListingEmbedding = require("../models/listingEmbedding.js");
const {
    embedText,
    getEmbeddingModelName,
    listingToEmbeddingText,
    getContentHash,
} = require("./embeddingService.js");

const cosineSimilarity = (first, second) => {
    if (!first?.length || first.length !== second?.length) return 0;

    let dot = 0;
    let firstMagnitude = 0;
    let secondMagnitude = 0;

    for (let index = 0; index < first.length; index += 1) {
        dot += first[index] * second[index];
        firstMagnitude += first[index] ** 2;
        secondMagnitude += second[index] ** 2;
    }

    if (!firstMagnitude || !secondMagnitude) return 0;
    return dot / (Math.sqrt(firstMagnitude) * Math.sqrt(secondMagnitude));
};

async function upsertListingEmbedding(listing) {
    const content = listingToEmbeddingText(listing);
    const contentHash = getContentHash(content);
    const existing = await ListingEmbedding.findOne({ listing: listing._id }).select("contentHash model");

    if (existing?.contentHash === contentHash && existing.model === getEmbeddingModelName()) {
        return { indexed: false, contentHash };
    }

    const embedding = await embedText(content);
    await ListingEmbedding.findOneAndUpdate(
        { listing: listing._id },
        {
            listing: listing._id,
            contentHash,
            embedding,
            model: getEmbeddingModelName(),
            updatedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return { indexed: true, contentHash };
}

async function syncListingEmbeddings() {
    const listings = await Listing.find({}).sort({ _id: 1 });
    let indexed = 0;

    for (const listing of listings) {
        const result = await upsertListingEmbedding(listing);
        if (result.indexed) indexed += 1;
    }

    const listingIds = listings.map((listing) => listing._id);
    const staleFilter = listingIds.length ? { listing: { $nin: listingIds } } : {};
    const cleanup = await ListingEmbedding.deleteMany(staleFilter);

    return { total: listings.length, indexed, removed: cleanup.deletedCount || 0 };
}

async function semanticSearch(query, limit = 8) {
    const queryEmbedding = await embedText(query);
    const records = await ListingEmbedding.find({}).lean();
    const ranked = records
        .map((record) => ({ record, score: cosineSimilarity(queryEmbedding, record.embedding) }))
        .sort((first, second) => second.score - first.score)
        .slice(0, Math.min(Math.max(Number(limit) || 8, 1), 12));

    const listings = await Listing.find({ _id: { $in: ranked.map(({ record }) => record.listing) } }).lean();
    const listingsById = new Map(listings.map((listing) => [String(listing._id), listing]));

    return ranked
        .map(({ record, score }) => {
            const listing = listingsById.get(String(record.listing));
            if (!listing) return null;
            return {
                ...listing,
                semanticScore: Math.round(Math.max(0, score) * 100),
            };
        })
        .filter(Boolean);
}

module.exports = {
    cosineSimilarity,
    upsertListingEmbedding,
    syncListingEmbeddings,
    semanticSearch,
};
