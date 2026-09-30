const express = require("express");
const router = express.Router({mergeParams: true});
const wrapAsync = require("../utils/wrapAsync.js");
const ExpressError = require("../utils/ExpressError.js");
const { reviewSchema } = require("../schema.js");
const Review = require("../models/reviews.js");
const Listing = require("../models/listing.js");
const { isLoggedIn } = require("../middleware.js");



//validate incoming reviews
const validateReview = (req, res, next) =>{
    req.body.review = {
        ...(req.body.review || {}),
        name: req.user.username,
    };
    let { error } = reviewSchema.validate(req.body);
    if(error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else{
        next();
    }
}

//reviews
//post review route
router.post("/", isLoggedIn, validateReview, wrapAsync( async(req, res) =>{
    let listing = await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    let newReview = new Review({
        comment: req.body.review.comment,
        rating: req.body.review.rating,
        author: req.user._id,
    });

    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
}));

//delete review route
router.delete("/:reviewId", isLoggedIn, wrapAsync(async(req, res)=>{
    let { id, reviewId } = req.params;
    const review = await Review.findById(reviewId);
    if (!review) {
        throw new ExpressError(404, "Review not found");
    }
    if (review.author && review.author.toString() !== req.user._id.toString()) {
        throw new ExpressError(403, "You are not allowed to delete this review");
    }
    await Listing.findByIdAndUpdate(id, {$pull: {reviews: reviewId}});
    await Review.findByIdAndDelete(reviewId);

    res.redirect(`/listings/${id}`)
}));

module.exports = router;