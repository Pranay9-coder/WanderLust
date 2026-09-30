const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { createTravelPlan, answerTravelAssistant } = require("../controllers/aiController.js");

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

/**
 * @openapi
 * /api/ai/travel-assistant:
 *   post:
 *     tags: [AI Travel Assistant]
 *     summary: Answer a travel question using retrieved listing context
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *                 example: Which properties are suitable for a quiet family trip near a beach?
 *     responses:
 *       200:
 *         description: Grounded answer with source listings
 *       503:
 *         description: Assistant or embedding service is unavailable
 */
router.post("/travel-assistant", wrapAsync(answerTravelAssistant));

module.exports = router;
