const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

const Mongoose_url = "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("conneted to DB");
    }).catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(Mongoose_url);
}

const initDB = async () => {
    Listing.deleteMany({});
    await Listing.insertMany(initData.data);
    console.log("Data was initialized");
};

initDB();