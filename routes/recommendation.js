const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { createRecommendations } = require("../controllers/recommendationController.js");

/**
 * @openapi
 * /api/recommendations:
 *   post:
 *     tags: [Recommendations]
 *     summary: Recommend listings from traveler preferences
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferences: { type: string, example: Quiet beach stay for a family }
 *               location: { type: string, example: Goa }
 *               category: { type: string, example: Beach }
 *               maxPrice: { type: integer, example: 5000 }
 *               minRating: { type: number, example: 4 }
 *               amenities: { type: string, example: Wi-Fi, Pool }
 *     responses:
 *       200:
 *         description: Ranked listing recommendations
 */
router.post("/", wrapAsync(createRecommendations));

module.exports = router;
