const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { searchListings } = require("../controllers/semanticSearchController.js");

/**
 * @openapi
 * /api/search/semantic:
 *   post:
 *     tags: [Semantic Search]
 *     summary: Find listings using semantic similarity
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: Quiet family property near a beach with reliable Wi-Fi
 *               limit:
 *                 type: integer
 *                 example: 8
 *     responses:
 *       200:
 *         description: Semantically relevant listings
 */
router.post("/semantic", wrapAsync(searchListings));

module.exports = router;
