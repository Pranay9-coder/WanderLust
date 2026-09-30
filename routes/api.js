const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const {
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
} = require("../controllers/apiController.js");

/**
 * @openapi
 * /api/listings:
 *   get:
 *     tags: [Listings]
 *     summary: Retrieve filtered listings
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Listing results returned successfully
 */
router.get("/listings", wrapAsync(listListings));

/**
 * @openapi
 * /api/listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Retrieve one listing by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Single listing returned successfully
 */
router.get("/listings/:id", wrapAsync(getListing));

/**
 * @openapi
 * /api/listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a listing
 *     responses:
 *       201:
 *         description: Listing created
 */
router.post("/listings", isLoggedIn, wrapAsync(createListingApi));

/**
 * @openapi
 * /api/listings/{id}:
 *   put:
 *     tags: [Listings]
 *     summary: Update a listing
 *     responses:
 *       200:
 *         description: Listing updated
 */
router.put("/listings/:id", isLoggedIn, wrapAsync(updateListingApi));

/**
 * @openapi
 * /api/listings/{id}:
 *   delete:
 *     tags: [Listings]
 *     summary: Delete a listing
 *     responses:
 *       200:
 *         description: Listing deleted
 */
router.delete("/listings/:id", isLoggedIn, wrapAsync(deleteListingApi));

/**
 * @openapi
 * /api/favorites:
 *   get:
 *     tags: [Favorites]
 *     summary: Fetch the logged-in user's favorites
 *     responses:
 *       200:
 *         description: Favorites returned successfully
 */
router.get("/favorites", isLoggedIn, wrapAsync(getFavorites));

/**
 * @openapi
 * /api/favorites/{id}:
 *   post:
 *     tags: [Favorites]
 *     summary: Toggle a favorite for the current user
 *     responses:
 *       200:
 *         description: Favorite status toggled
 */
router.post("/favorites/:id", isLoggedIn, wrapAsync(toggleFavoriteApi));

/**
 * @openapi
 * /api/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Get current user's bookings
 *     responses:
 *       200:
 *         description: Bookings returned successfully
 */
router.get("/bookings", isLoggedIn, wrapAsync(getBookings));

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Create a booking for a listing
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post("/bookings", isLoggedIn, wrapAsync(createBookingApi));

/**
 * @openapi
 * /api/bookings/{id}:
 *   delete:
 *     tags: [Bookings]
 *     summary: Cancel a booking
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
router.delete("/bookings/:id", isLoggedIn, wrapAsync(cancelBookingApi));

module.exports = router;
