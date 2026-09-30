const ExpressError = require("../utils/ExpressError.js");
const {
    getListingsCached,
    getListingById,
    createListing,
    updateListing,
    deleteListing,
    getUserFavorites,
    toggleFavorite,
    getUserBookings,
    createBookingForUser,
    cancelBookingForUser,
} = require("../services/apiService.js");

const listListings = async (req, res, next) => {
    try {
        const { listings, source } = await getListingsCached(req.query);
        res.set("X-Cache", source);
        res.status(200).json({ success: true, count: listings.length, data: listings });
    } catch (error) {
        next(error);
    }
};

const getListing = async (req, res, next) => {
    try {
        const listing = await getListingById(req.params.id);
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }
        res.status(200).json({ success: true, data: listing });
    } catch (error) {
        next(error);
    }
};

const createListingApi = async (req, res, next) => {
    try {
        const listing = await createListing(req.body.listing || req.body, req.user._id);
        res.status(201).json({ success: true, message: "Listing created", data: listing });
    } catch (error) {
        next(error);
    }
};

const updateListingApi = async (req, res, next) => {
    try {
        const listing = await updateListing(req.params.id, req.body.listing || req.body);
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }
        res.status(200).json({ success: true, message: "Listing updated", data: listing });
    } catch (error) {
        next(error);
    }
};

const deleteListingApi = async (req, res, next) => {
    try {
        const listing = await deleteListing(req.params.id);
        if (!listing) {
            throw new ExpressError(404, "Listing not found");
        }
        res.status(200).json({ success: true, message: "Listing deleted", data: listing });
    } catch (error) {
        next(error);
    }
};

const getFavorites = async (req, res, next) => {
    try {
        const favorites = await getUserFavorites(req.user._id);
        res.status(200).json({ success: true, count: favorites.length, data: favorites });
    } catch (error) {
        next(error);
    }
};

const toggleFavoriteApi = async (req, res, next) => {
    try {
        const listingId = req.params.id;
        const result = await toggleFavorite(req.user._id, listingId);
        res.status(200).json({ success: true, favorite: result.favorite, message: result.favorite ? "Added to favorites" : "Removed from favorites" });
    } catch (error) {
        next(error);
    }
};

const getBookings = async (req, res, next) => {
    try {
        const bookings = await getUserBookings(req.user._id);
        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        next(error);
    }
};

const createBookingApi = async (req, res, next) => {
    try {
        const body = req.body.booking || req.body;
        const booking = await createBookingForUser(req.user._id, req.params.id || body.listing, body.checkIn, body.checkOut);
        res.status(201).json({ success: true, message: "Booking created successfully", data: booking });
    } catch (error) {
        next(error);
    }
};

const cancelBookingApi = async (req, res, next) => {
    try {
        const booking = await cancelBookingForUser(req.user._id, req.params.id);
        res.status(200).json({ success: true, message: "Booking cancelled successfully", data: booking });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listListings,
    getListing,
    createListingApi,
    updateListingApi,
    deleteListingApi,
    getFavorites,
    toggleFavoriteApi,
    getBookings,
    createBookingApi,
    cancelBookingApi,
};
