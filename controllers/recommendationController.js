const { getRecommendations } = require("../services/recommendationService.js");

const createRecommendations = async (req, res, next) => {
    try {
        const result = await getRecommendations(req.body || {});
        res.status(200).json({
            success: true,
            count: result.recommendations.length,
            data: result.recommendations,
            meta: result.preferences,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createRecommendations,
};
