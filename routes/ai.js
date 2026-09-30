const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { createTravelPlan } = require("../controllers/aiController.js");

/**
 * @openapi
 * /api/ai/travel-plan:
 *   post:
 *     tags: [AI Travel Planner]
 *     summary: Generate a structured travel itinerary with Gemini
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: Plan a 5-day trip to Goa for 2 people under INR 20000. I prefer beaches and nightlife.
 *     responses:
 *       200:
 *         description: Structured travel plan generated successfully
 *       400:
 *         description: Invalid travel request
 *       503:
 *         description: Gemini API key is not configured
 */
router.post("/travel-plan", wrapAsync(createTravelPlan));

module.exports = router;
