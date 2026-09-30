const { GoogleGenerativeAI } = require("@google/generative-ai");

const getApiKey = () => process.env.GEMINI_API_KEY?.trim();

const hasUsableApiKey = () => {
    const key = getApiKey();
    return Boolean(key && key !== "your_gemini_api_key_here");
};

const createAiError = (statusCode, message, cause) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (cause) error.cause = cause;
    return error;
};

const extractJson = (text) => {
    const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
    try {
        return JSON.parse(cleaned);
    } catch (error) {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return JSON.parse(cleaned.slice(start, end + 1));
        }
        throw error;
    }
};

const normalizePlan = (plan) => ({
    tripOverview: String(plan.tripOverview || "Your personalized travel plan."),
    itinerary: Array.isArray(plan.itinerary) ? plan.itinerary.map((day, index) => ({
        day: day.day || `Day ${index + 1}`,
        title: day.title || "Explore and unwind",
        morning: day.morning || "Start with a relaxed local breakfast.",
        afternoon: day.afternoon || "Explore a recommended local area.",
        evening: day.evening || "Enjoy a flexible evening at your own pace.",
    })) : [],
    recommendedActivities: Array.isArray(plan.recommendedActivities) ? plan.recommendedActivities : [],
    suggestedLocations: Array.isArray(plan.suggestedLocations) ? plan.suggestedLocations : [],
    estimatedBudget: {
        currency: plan.estimatedBudget?.currency || "INR",
        total: plan.estimatedBudget?.total || "Not specified",
        breakdown: Array.isArray(plan.estimatedBudget?.breakdown) ? plan.estimatedBudget.breakdown : [],
    },
    travelTips: Array.isArray(plan.travelTips) ? plan.travelTips : [],
});

async function generateTravelPlan(request) {
    if (typeof request !== "string") {
        throw createAiError(400, "Please provide your travel request as text.");
    }

    if (!request || request.trim().length < 10) {
        throw createAiError(400, "Please describe your destination, duration, travelers, and preferences.");
    }

    if (request.length > 3000) {
        throw createAiError(400, "Your travel request is too long. Please keep it under 3,000 characters.");
    }

    if (!hasUsableApiKey()) {
        throw createAiError(503, "The AI travel planner is not configured yet. Add GEMINI_API_KEY to your local .env file.");
    }

    const genAI = new GoogleGenerativeAI(getApiKey());
    const model = genAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.65,
            responseMimeType: "application/json",
        },
    });

    const prompt = `You are WanderLust's travel planning assistant. Create a practical, inspiring itinerary from the user's request below.

Return ONLY valid JSON matching this exact shape:
{
  "tripOverview": "short overview",
  "itinerary": [{"day":"Day 1","title":"...","morning":"...","afternoon":"...","evening":"..."}],
  "recommendedActivities": ["..."],
  "suggestedLocations": ["..."],
  "estimatedBudget": {"currency":"INR","total":"...","breakdown":["..." ]},
  "travelTips": ["..."]
}

Be transparent when costs or travel times are approximate. Do not claim to have live availability, bookings, or current prices. Keep the plan realistic and tailor it to the user's duration, group size, budget, interests, and constraints.

User request:
${request.trim()}`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        return normalizePlan(extractJson(responseText));
    } catch (error) {
        if (error.status === 503) {
            throw createAiError(503, "Gemini is temporarily busy. Please try again in a moment.", error);
        }
        if (error.status === 401 || error.status === 403) {
            throw createAiError(502, "Gemini rejected the configured API key. Check that the key is active and has Generative Language API access.", error);
        }
        throw createAiError(502, "The AI travel planner could not generate a plan right now. Please try again.", error);
    }
}

module.exports = {
    generateTravelPlan,
    extractJson,
    normalizePlan,
};
