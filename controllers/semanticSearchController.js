const { searchListingsSemantically } = require("../services/semanticSearchService.js");

const searchListings = async (req, res, next) => {
    try {
        const query = req.body.query || req.body.q;
        const { results, index } = await searchListingsSemantically(query, req.body.limit);
        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
            meta: {
                indexed: index.indexed,
                totalIndexedCandidates: index.total,
                vectorStore: "local-mongodb-cosine",
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchListings,
};
