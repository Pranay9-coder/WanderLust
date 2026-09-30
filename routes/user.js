const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const wrapAsync = require("../utils/wrapAsync");
const passport = require("passport");
const { isLoggedIn, authLimiter } = require("../middleware.js");

router.get("/signup", (req, res)=>{
    res.render("users/signup.ejs");
});

router.post("/signup", authLimiter, wrapAsync(async(req, res, next)=>{
    try {
        let {username, email, password} = req.body;
        const newUser = new User({email, username});
        const registerUser = await User.register(newUser, password);
        req.login(registerUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", "Welcome to WanderLust");
            res.redirect("/listings");
        });
    } catch(e){
        req.flash("error", e.message);
        res.redirect("/signup");
    }
}));

router.get("/login", (req, res) =>{
    res.render("users/login.ejs");
})

router.post("/login", authLimiter, passport.authenticate("local", {failureRedirect: "/login", failureFlash: true}), (req, res) => {
    req.flash("success", "Welcome back to WanderLust");
    const redirectUrl = req.session.redirectUrl || "/listings";
    delete req.session.redirectUrl;
    res.redirect(redirectUrl);
})

router.get("/favorites", (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to view favorites");
        return res.redirect("/login");
    }

    User.findById(req.user._id)
        .populate("favorites")
        .then((user) => {
            res.render("users/favorites.ejs", { listings: user.favorites || [] });
        })
        .catch((err) => {
            req.flash("error", "Unable to load favorites");
            res.redirect("/listings");
        });
});

router.get("/bookings", (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash("error", "You must be logged in to view your bookings");
        return res.redirect("/login");
    }

    Booking.find({ user: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 })
        .then((bookings) => {
            res.render("users/bookings.ejs", { bookings });
        })
        .catch((err) => {
            req.flash("error", "Unable to load bookings");
            res.redirect("/listings");
        });
});

router.get("/dashboard", isLoggedIn, wrapAsync(async (req, res) => {
    const user = await User.findById(req.user._id).populate("favorites");
    const bookings = await Booking.find({ user: req.user._id }).populate("listing").sort({ createdAt: -1 });
    const myListings = await Listing.find({ _id: { $in: [] } });
    res.render("users/dashboard.ejs", {
        user,
        favorites: user.favorites || [],
        bookings,
        myListings,
    });
}));

router.post("/bookings/:id/cancel", isLoggedIn, wrapAsync(async (req, res) => {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
        req.flash("error", "Booking not found");
        return res.redirect("/bookings");
    }

    if (booking.user.toString() !== req.user._id.toString()) {
        req.flash("error", "You are not allowed to cancel this booking");
        return res.redirect("/bookings");
    }

    booking.status = "cancelled";
    await booking.save();
    req.flash("success", "Booking cancelled successfully");
    res.redirect("/bookings");
}));

router.get("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You have been logged out");
        res.redirect("/listings");
    });
})

module.exports = router;