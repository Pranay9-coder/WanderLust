const { GoogleGenerativeAI } = require("@google/generative-ai");
const { searchListingsSemantically } = require("./semanticSearchService.js");

const hasUsableApiKey = () => {
    const key = process.env.GEMINI_API_KEY?.trim();
    return Boolean(key && key !== "your_gemini_api_key_here");
};

const createAssistantError = (statusCode, message, cause) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (cause) error.cause = cause;
    return error;
};

const buildContext = (listings) => listings.map((listing, index) => ({
    source: `L${index + 1}`,
    id: String(listing._id),
    title: listing.title,
    location: `${listing.location}, ${listing.country}`,
    category: listing.category,
    pricePerNight: listing.price,
    rating: listing.rating || 0,
    amenities: listing.amenities || [],
    description: listing.description || "",
    semanticScore: listing.semanticScore,
}));

async function answerTravelQuestion(question) {
    if (typeof question !== "string" || question.trim().length < 3) {
        throw createAssistantError(400, "Please ask a travel question with at least 3 characters.");
    }

    if (question.length > 1500) {
        throw createAssistantError(400, "Please keep your travel question under 1,500 characters.");
    }

    const retrieval = await searchListingsSemantically(question.trim(), 6);
    const context = buildContext(retrieval.results);

    if (!context.length) {
        return {
            answer: "I couldn’t find any matching listings in WanderLust for that question.",
            sources: [],
            retrieval: retrieval.index,
        };
    }

    if (!hasUsableApiKey()) {
        throw createAssistantError(503, "The travel assistant is not configured yet. Add GEMINI_API_KEY to your local .env file.");
    }

    const model = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim()).getGenerativeModel({
        model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.2,
        },
    });

    const prompt = `You are WanderLust's grounded travel assistant. Answer the user's question using ONLY the listing context below.

Rules:
- Never invent a listing, price, rating, amenity, availability, booking status, or location.
- If the context does not support a detail, say that the listing data does not specify it.
- Mention relevant source labels such as [L1] or [L2] so the user can see what supports your answer.
- Be concise, helpful, and honest. Do not claim live availability or current prices.

User question:
${question.trim()}

Listing context:
${JSON.stringify(context, null, 2)}`;

    try {
        const result = await model.generateContent(prompt);
        return {
            answer: result.response.text().trim(),
            sources: context,
            retrieval: retrieval.index,
        };
    } catch (error) {
        if (error.status === 503) {
            throw createAssistantError(503, "Gemini is temporarily busy. Please try the question again in a moment.", error);
        }
        if (error.status === 401 || error.status === 403) {
            throw createAssistantError(502, "Gemini rejected the configured API key for the travel assistant.", error);
        }
        throw createAssistantError(502, "The travel assistant could not answer right now. Please try again.", error);
    }
}

module.exports = {
    buildContext,
    answerTravelQuestion,
};
