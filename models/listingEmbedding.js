const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ListingEmbeddingSchema = new Schema({
    listing: {
        type: Schema.Types.ObjectId,
        ref: "Listing",
        required: true,
        unique: true,
        index: true,
    },
    contentHash: {
        type: String,
        required: true,
    },
    embedding: {
        type: [Number],
        required: true,
    },
    model: {
        type: String,
        required: true,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("ListingEmbedding", ListingEmbeddingSchema);
