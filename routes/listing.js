const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { listingSchema } = require("../schema.js");
const Listing = require("../models/listing.js");
const {isLoggedIn} = require("../middleware.js");


// Validate incoming listing payload
const validateListing = (req, res, next) => {
    let { error } = listingSchema.validate(req.body);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
};

//Index route
router.get("/", wrapAsync(async(req, res) =>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
}));

//new route
router.get("/new",isLoggedIn, (req, res) =>{
    res.render("listings/new.ejs");
});

//show route
router.get("/:id", wrapAsync(async(req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("listings/show.ejs" , {listing})
}));

//create Route
router.post("/new",isLoggedIn, validateListing, wrapAsync(async(req, res) =>{
    const payload = { ...req.body.listing };

    // Normalize image to the schema shape { url, filename }
    if (payload.image) {
        payload.image = { url: payload.image, filename: "listingimage" };
    }

    const newListing = new Listing(payload);
    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
}));

//edit route
router.get("/:id/edit",isLoggedIn, validateListing, wrapAsync(async(req, res) =>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", {listing});
}));

//update route
router.put("/:id",isLoggedIn, validateListing, wrapAsync(async(req, res)=>{
    let { id } = req.params;
    const payload = { ...req.body.listing };

    // Only overwrite image when a URL is provided; otherwise keep existing image
    if (payload.image) {
        payload.image = { url: payload.image, filename: "listingimage" };
    } else {
        delete payload.image;
    }

    await Listing.findByIdAndUpdate(id, payload);
    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
}));

//delete route
router.delete("/:id",isLoggedIn, wrapAsync(async(req, res) =>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}));

module.exports = router;