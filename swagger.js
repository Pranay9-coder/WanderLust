const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "WanderLust API",
            version: "1.0.0",
            description: "REST API for WanderLust travel listings, favorites, and bookings.",
        },
        servers: [
            {
                url: "http://localhost:8080",
                description: "Local development server",
            },
        ],
        tags: [
            { name: "Listings", description: "Travel listing endpoints" },
            { name: "Favorites", description: "Wishlist favorite endpoints" },
            { name: "Bookings", description: "Booking endpoints" },
            { name: "AI Travel Planner", description: "Gemini-powered itinerary generation" },
        ],
    },
    apis: ["./routes/*.js", "./controllers/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = { specs, swaggerUi };
