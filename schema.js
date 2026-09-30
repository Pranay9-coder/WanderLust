const Joi = require("joi");

module.exports.listingSchema = Joi.object({
    listing: Joi.object({
        title: Joi.string().required(),
        description: Joi.string().allow(""),
        image: Joi.string().uri().allow(""),
        price: Joi.number().integer().min(1).required(),
        location: Joi.string().required(),
        country: Joi.string().required(),
        category: Joi.string().allow("", null).optional(),
        rating: Joi.number().min(0).max(5).optional(),
        amenities: Joi.alternatives().try(
            Joi.string(),
            Joi.array().items(Joi.string())
        ).optional(),
    }).required(),
});

module.exports.reviewSchema = Joi.object({
    review: Joi.object({
        name: Joi.string().required(),
        rating: Joi.number().required().min(1).max(5),
        comment: Joi.string().required(),
    }).required()
});