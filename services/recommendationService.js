const Listing = require("../models/listing.js");

const STOP_WORDS = new Set([
    "and", "the", "with", "for", "near", "want", "like", "prefer", "looking", "find", "good", "best", "stay", "stays", "property", "properties",
]);

const normalize = (value = "") => String(value).trim().toLowerCase().replace(/wi[-\s]?fi/g, "wifi");

const tokenize = (value = "") => normalize(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));

const parseNumber = (value) => {
    if (value === undefined || value === null || value === "") return null;
    const number = Number(String(value).replace(/[^0-9.]/g, ""));
    return Number.isFinite(number) ? number : null;
};

const parsePreferences = (input = {}) => {
    const preferences = typeof input === "string" ? { preferences: input } : input;
    const freeText = preferences.preferences || preferences.prompt || "";
    const maxPrice = parseNumber(preferences.maxPrice || preferences.budget);
    const minRating = parseNumber(preferences.minRating || preferences.rating);
    const amenities = Array.isArray(preferences.amenities)
        ? preferences.amenities.join(" ")
        : preferences.amenities || "";

    return {
        freeText: String(freeText).trim(),
        tokens: tokenize(`${freeText} ${preferences.location || ""} ${preferences.category || ""} ${amenities}`),
        location: normalize(preferences.location),
        category: normalize(preferences.category),
        amenities: tokenize(amenities),
        maxPrice,
        minRating,
    };
};

const addReason = (reasons, reason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
};

const scoreListing = (listing, preferences) => {
    const reasons = [];
    let score = 0;
    const title = normalize(listing.title);
    const description = normalize(listing.description);
    const location = normalize(`${listing.location} ${listing.country}`);
    const category = normalize(listing.category);
    const amenities = (listing.amenities || []).map(normalize);
    const searchableText = `${title} ${description} ${location} ${category} ${amenities.join(" ")}`;

    const matchedTokens = [...new Set(preferences.tokens.filter((token) => searchableText.includes(token)))];
    if (matchedTokens.length) {
        score += Math.min(matchedTokens.length * 7, 35);
        addReason(reasons, `Matches ${matchedTokens.slice(0, 3).join(", ")}`);
    }

    if (preferences.location && location.includes(preferences.location)) {
        score += 25;
        addReason(reasons, `In ${listing.location}`);
    }

    if (preferences.category && category === preferences.category) {
        score += 25;
        addReason(reasons, `${listing.category} stay`);
    }

    const matchedAmenities = preferences.amenities.filter((amenity) => amenities.some((item) => item.includes(amenity)));
    if (matchedAmenities.length) {
        score += Math.min(matchedAmenities.length * 12, 30);
        addReason(reasons, `Has ${matchedAmenities.slice(0, 2).join(", ")}`);
    }

    if (preferences.maxPrice !== null) {
        if (listing.price <= preferences.maxPrice) {
            score += 18;
            addReason(reasons, "Within your budget");
        } else {
            score -= 18;
            addReason(reasons, "Above your budget");
        }
    }

    if (preferences.minRating !== null) {
        if ((listing.rating || 0) >= preferences.minRating) {
            score += 18;
            addReason(reasons, `${listing.rating || 0}★ rating`);
        } else {
            score -= 10;
        }
    } else if (listing.rating) {
        score += Number(listing.rating) * 2;
    }

    if (!reasons.length) addReason(reasons, "A popular stay to explore");

    return {
        ...listing.toObject(),
        matchScore: Math.min(Math.max(score, 0), 100),
        matchReasons: reasons,
    };
};

async function getRecommendations(input = {}) {
    const preferences = parsePreferences(input);
    if (preferences.freeText.length > 1500) {
        const error = new Error("Please keep your preferences under 1,500 characters.");
        error.statusCode = 400;
        throw error;
    }

    const listings = await Listing.find({});
    const recommendations = listings
        .map((listing) => scoreListing(listing, preferences))
        .sort((first, second) => second.matchScore - first.matchScore || (second.rating || 0) - (first.rating || 0))
        .slice(0, Math.min(parseNumber(input.limit) || 6, 12));

    return {
        recommendations,
        preferences: {
            location: preferences.location || null,
            category: preferences.category || null,
            maxPrice: preferences.maxPrice,
            minRating: preferences.minRating,
            amenities: preferences.amenities,
        },
    };
}

module.exports = {
    tokenize,
    parsePreferences,
    scoreListing,
    getRecommendations,
};
