const { generateTravelPlan } = require("../services/aiService.js");

const createTravelPlan = async (req, res, next) => {
    try {
        const request = req.body.prompt || req.body.request || req.body.query;
        const plan = await generateTravelPlan(request);
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTravelPlan,
};
