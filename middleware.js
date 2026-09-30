const ExpressError = require("./utils/ExpressError.js");
const Listing = require("./models/listing.js");
const { listingSchema } = require("./schema.js");
const { rateLimit } = require("express-rate-limit");

const isApiRequest = (req) => req.originalUrl.startsWith("/api");

module.exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: "Too many authentication attempts. Please try again later.",
});

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        if (isApiRequest(req)) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }
        req.session.redirectUrl = req.originalUrl;
        req.flash("error", "You must be logged in to continue.");
        return res.redirect("/login");
    }
    next();
};

module.exports.isListingOwner = async (req, res, next) => {
    const listing = await Listing.findById(req.params.id).select("owner");
    if (!listing) throw new ExpressError(404, "Listing not found");

    // Legacy seeded listings do not have an owner yet; preserve their existing local behavior.
    if (listing.owner && listing.owner.toString() !== req.user._id.toString()) {
        throw new ExpressError(403, "You are not allowed to modify this listing");
    }
    next();
};

module.exports.validateListingPayload = (req, res, next) => {
    const payload = req.body?.listing ? req.body : { listing: req.body };
    const { error } = listingSchema.validate(payload, { abortEarly: false });
    if (error) {
        const message = error.details.map((detail) => detail.message).join(", ");
        throw new ExpressError(400, message);
    }
    next();
};

module.exports.saveRedirectedUrl = (req, res, next) =>{
    if(req.session.redirectUrl){
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}