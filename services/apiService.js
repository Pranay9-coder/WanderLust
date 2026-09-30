const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Booking = require("../models/booking.js");
const { getJson, setJson, invalidateByPrefix } = require("./redisClient.js");

const LISTINGS_CACHE_PREFIX = "wanderlust:api:listings:";
const LISTINGS_CACHE_TTL_SECONDS = 60;

const normalizeAmenities = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
};

const parseFilters = (query = {}) => {
    const { search, location, country, category, minPrice, maxPrice, rating, amenities } = query;
    const filters = {};

    if (search && search.trim()) {
        const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safeSearch, "i");
        filters.$or = [
            { title: regex },
            { description: regex },
            { location: regex },
            { country: regex },
        ];
    }

    if (location && location.trim()) {
        filters.location = new RegExp(location.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (country && country.trim()) {
        filters.country = new RegExp(country.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }

    if (category && category.trim()) {
        filters.category = new RegExp(`^${category.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
    }

    if (minPrice || maxPrice) {
        filters.price = {};
        if (minPrice !== undefined && minPrice !== "") filters.price.$gte = Number(minPrice);
        if (maxPrice !== undefined && maxPrice !== "") filters.price.$lte = Number(maxPrice);
    }

    if (rating) {
        filters.rating = { $gte: Number(rating) };
    }

    if (amenities) {
        const amenityValues = normalizeAmenities(amenities);
        if (amenityValues.length) {
            filters.amenities = {
                $in: amenityValues.map((item) => new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")),
            };
        }
    }

    return filters;
};

const buildListingPayload = (incoming = {}) => {
    const payload = { ...incoming };

    if (payload.image && typeof payload.image === "string") {
        payload.image = { url: payload.image, filename: "listingimage" };
    }

    if (payload.amenities) {
        payload.amenities = normalizeAmenities(payload.amenities);
    }

    if (payload.category) {
        payload.category = payload.category.trim();
    }

    if (payload.rating !== undefined && payload.rating !== "") {
        payload.rating = Number(payload.rating);
    }

    return payload;
};

const parseBookingDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const bookingConflictQuery = (listingId, checkIn, checkOut, excludeBookingId = null) => {
    const query = {
        listing: listingId,
        status: { $ne: "cancelled" },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    return query;
};

async function getListings(query = {}) {
    return Listing.find(parseFilters(query));
}

const buildListingsCacheKey = (query = {}) => {
    const normalizedQuery = Object.keys(query)
        .sort()
        .reduce((result, key) => {
            const value = query[key];
            if (value !== undefined && value !== "") result[key] = value;
            return result;
        }, {});

    return `${LISTINGS_CACHE_PREFIX}${JSON.stringify(normalizedQuery)}`;
};

async function getListingsCached(query = {}) {
    const cacheKey = buildListingsCacheKey(query);
    const cachedListings = await getJson(cacheKey);

    if (cachedListings) {
        return { listings: cachedListings, source: "HIT" };
    }

    const listings = await getListings(query);
    await setJson(cacheKey, listings, LISTINGS_CACHE_TTL_SECONDS);
    return { listings, source: "MISS" };
}

async function invalidateListingCache() {
    return invalidateByPrefix(LISTINGS_CACHE_PREFIX);
}

async function getListingById(id) {
    return Listing.findById(id).populate("reviews");
}

async function createListing(payload) {
    const listing = new Listing(buildListingPayload(payload));
    await listing.save();
    await invalidateListingCache();
    return listing;
}

async function updateListing(id, payload) {
    const updated = await Listing.findByIdAndUpdate(id, buildListingPayload(payload), { new: true });
    await invalidateListingCache();
    return updated;
}

async function deleteListing(id) {
    const deleted = await Listing.findByIdAndDelete(id);
    await invalidateListingCache();
    return deleted;
}

async function getUserFavorites(userId) {
    const user = await User.findById(userId).populate("favorites");
    return user ? user.favorites : [];
}

async function toggleFavorite(userId, listingId) {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    const hasFavorite = user.favorites.some((id) => id.toString() === listingId);

    if (hasFavorite) {
        user.favorites = user.favorites.filter((id) => id.toString() !== listingId);
        await user.save();
        return { favorite: false };
    }

    user.favorites.push(listingId);
    await user.save();
    return { favorite: true };
}

async function getUserBookings(userId) {
    return Booking.find({ user: userId })
        .populate("listing")
        .sort({ createdAt: -1 });
}

async function createBookingForUser(userId, listingId, checkIn, checkOut) {
    const startDate = parseBookingDate(checkIn);
    const endDate = parseBookingDate(checkOut);

    if (!startDate || !endDate) {
        throw new Error("Please provide valid check-in and check-out dates.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
        throw new Error("Check-in date cannot be in the past.");
    }

    if (endDate <= startDate) {
        throw new Error("Check-out date must be after the check-in date.");
    }

    const conflict = await Booking.findOne(bookingConflictQuery(listingId, startDate, endDate));
    if (conflict) {
        throw new Error("This date range is already booked for this listing.");
    }

    const booking = new Booking({
        user: userId,
        listing: listingId,
        checkIn: startDate,
        checkOut: endDate,
        status: "confirmed",
    });

    await booking.save();
    return booking;
}

async function cancelBookingForUser(userId, bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error("Booking not found");
    }
    if (booking.user.toString() !== userId.toString()) {
        throw new Error("You are not allowed to cancel this booking");
    }

    booking.status = "cancelled";
    await booking.save();
    return booking;
}

module.exports = {
    normalizeAmenities,
    parseFilters,
    buildListingPayload,
    getListings,
    getListingsCached,
    buildListingsCacheKey,
    invalidateListingCache,
    getListingById,
    createListing,
    updateListing,
    deleteListing,
    getUserFavorites,
    toggleFavorite,
    getUserBookings,
    createBookingForUser,
    cancelBookingForUser,
};
