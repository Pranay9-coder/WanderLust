const { generateTravelPlan } = require("../services/aiService.js");
const { answerTravelQuestion } = require("../services/assistantService.js");

const createTravelPlan = async (req, res, next) => {
    try {
        const request = req.body.prompt || req.body.request || req.body.query;
        const plan = await generateTravelPlan(request);
        res.status(200).json({ success: true, data: plan });
    } catch (error) {
        next(error);
    }
};

const answerTravelAssistant = async (req, res, next) => {
    try {
        const question = req.body.question || req.body.query || req.body.prompt;
        const result = await answerTravelQuestion(question);
        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createTravelPlan,
    answerTravelAssistant,
};
