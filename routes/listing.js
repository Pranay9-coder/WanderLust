const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");
const Booking = require("../models/booking.js");
const { isLoggedIn, isListingOwner } = require("../middleware.js");
const { invalidateListingCache } = require("../services/apiService.js");

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
            filters.amenities = { $in: amenityValues.map((item) => new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i")) };
        }
    }

    return filters;
};

// Validate incoming listing payload
const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
};

const buildFavoriteSet = async (userId) => {
    if (!userId) return new Set();
    const user = await User.findById(userId).select("favorites");
    return new Set((user?.favorites || []).map((id) => id.toString()));
};

const parseBookingDate = (value) => {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const checkBookingConflict = async (listingId, checkIn, checkOut, excludeBookingId = null) => {
    const query = {
        listing: listingId,
        status: { $ne: "cancelled" },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn },
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    return await Booking.findOne(query);
};

// Index route with search + filter support
router.get("/", wrapAsync(async (req, res) => {
    const filters = parseFilters(req.query);
    const allListings = await Listing.find(filters);
    const favoriteIds = req.user ? await buildFavoriteSet(req.user._id) : new Set();
    res.render("listings/index.ejs", { allListings, filters: req.query, favoriteIds });
}));

//new route
router.get("/new", isLoggedIn, (req, res) => {
    res.render("listings/new.ejs");
});

//show route
router.get("/:id", wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    const favorite = req.user ? await User.exists({ _id: req.user._id, favorites: id }) : false;
    res.render("listings/show.ejs", { listing, favorite: !!favorite });
}));

//create Route
router.post("/new", isLoggedIn, validateListing, wrapAsync(async (req, res) => {
    const payload = { ...req.body.listing };

    if (payload.image) {
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

    const newListing = new Listing({ ...payload, owner: req.user._id });
    await newListing.save();
    await invalidateListingCache();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}));

// edit route
router.get("/:id/edit", isLoggedIn, wrapAsync(isListingOwner), wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    res.render("listings/edit.ejs", { listing });
}));

//update route
router.put("/:id", isLoggedIn, wrapAsync(isListingOwner), validateListing, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const payload = { ...req.body.listing };

    if (payload.image) {
        payload.image = { url: payload.image, filename: "listingimage" };
    } else {
        delete payload.image;
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

    await Listing.findByIdAndUpdate(id, payload);
    await invalidateListingCache();
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}));

// favorite route for listing pages
router.post("/:id/favorite", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    const user = await User.findById(req.user._id);
    const favoriteIndex = user.favorites.findIndex((listingId) => listingId.toString() === id);

    if (favoriteIndex === -1) {
        user.favorites.push(listing._id);
        await user.save();
        req.flash("success", "Added to favorites");
    } else {
        user.favorites.splice(favoriteIndex, 1);
        await user.save();
        req.flash("success", "Removed from favorites");
    }

    res.redirect("back");
}));

// booking route for listing pages
router.post("/:id/bookings", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    const { checkIn, checkOut } = req.body.booking || req.body;
    const startDate = parseBookingDate(checkIn);
    const endDate = parseBookingDate(checkOut);

    if (!startDate || !endDate) {
        throw new ExpressError(400, "Please provide valid check-in and check-out dates.");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate < today) {
        throw new ExpressError(400, "Check-in date cannot be in the past.");
    }

    if (endDate <= startDate) {
        throw new ExpressError(400, "Check-out date must be after the check-in date.");
    }

    const conflict = await checkBookingConflict(id, startDate, endDate);
    if (conflict) {
        throw new ExpressError(400, "This date range is already booked for this listing.");
    }

    const booking = new Booking({
        user: req.user._id,
        listing: listing._id,
        checkIn: startDate,
        checkOut: endDate,
        status: "confirmed",
    });

    await booking.save();
    req.flash("success", "Booking created successfully!");
    res.redirect("/bookings");
}));

//delete route
router.delete("/:id", isLoggedIn, wrapAsync(isListingOwner), wrapAsync(async (req, res) => {
    let { id } = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    await invalidateListingCache();
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}));

module.exports = router;