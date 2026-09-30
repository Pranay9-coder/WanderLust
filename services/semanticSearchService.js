const { syncListingEmbeddings, semanticSearch } = require("./vectorStore.js");

async function searchListingsSemantically(query, limit = 8) {
    if (typeof query !== "string" || query.trim().length < 3) {
        const error = new Error("Please enter a semantic search query with at least 3 characters.");
        error.statusCode = 400;
        throw error;
    }

    if (query.length > 1000) {
        const error = new Error("Please keep your semantic search query under 1,000 characters.");
        error.statusCode = 400;
        throw error;
    }

    const index = await syncListingEmbeddings();
    const results = await semanticSearch(query.trim(), limit);

    return { results, index };
}

module.exports = {
    searchListingsSemantically,
};
