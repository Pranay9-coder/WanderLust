require("dotenv").config();
const crypto = require("crypto");
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const Listing = require("./models/listing.js");
const { specs, swaggerUi } = require("./swagger.js");
const { connectRedis } = require("./services/redisClient.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");
const apiRouter = require("./routes/api.js");
const aiRouter = require("./routes/ai.js");
const recommendationRouter = require("./routes/recommendation.js");
const semanticSearchRouter = require("./routes/semanticSearch.js");

const Mongoose_url = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/wanderlust";

main()
    .then(() => {
        console.log("conneted to DB");
    }).catch((err) => {
        console.log(err);
    });

connectRedis();

async function main() {
    await mongoose.connect(Mongoose_url);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
}));
const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
}));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);

const configuredSessionSecret = process.env.SESSION_SECRET?.trim();
const sessionSecret = configuredSessionSecret && !configuredSessionSecret.startsWith("replace_")
    ? configuredSessionSecret
    : crypto.randomBytes(32).toString("hex");
if (!configuredSessionSecret || configuredSessionSecret.startsWith("replace_")) {
    console.warn("SESSION_SECRET is not configured; using a temporary development secret.");
}

const sessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
    },
};

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message: "Too many API requests. Please try again later." },
});

app.use(session(sessionOptions));
app.use(flash());
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next)=>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currentUser = req.user;
    next();
});

app.get("/", async (req, res, next) => {
    try {
        const listings = await Listing.find().sort({ rating: -1, _id: -1 }).limit(6);
        const categories = [...new Set(listings.map((listing) => listing.category).filter(Boolean))].slice(0, 6);
        res.render("home.ejs", { listings, categories });
    } catch (error) {
        next(error);
    }
});

app.get("/planner", (req, res) => {
    res.render("planner.ejs");
});

app.get("/recommendations", (req, res) => {
    res.render("recommendations.ejs");
});

app.get("/semantic-search", (req, res) => {
    res.render("semantic-search.ejs");
});

app.get("/assistant", (req, res) => {
    res.render("assistant.ejs");
});

// app.get("/demouser", async(req, res) =>{
//     let fakeUser = new User({
//         email:"student@gmail.com",
//         username: "delta-student"
//     });
//     let registeredUser = await User.register(fakeUser, "helloworld"); //.registration(user,password,)
//     res.send(registeredUser);
// });

app.use("/api", apiLimiter);
app.use("/api", apiRouter);
app.use("/api/ai", aiRouter);
app.use("/api/recommendations", recommendationRouter);
app.use("/api/search", semanticSearchRouter);
app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Fallback for all unmatched routes
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not Found"));
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    if (req.originalUrl.startsWith("/api")) {
        const safeMessage = statusCode >= 500 ? "Something went wrong. Please try again later." : message;
        return res.status(statusCode).json({
            success: false,
            message: safeMessage,
        });
    }
    req.flash("error", statusCode >= 500 ? "Something went wrong. Please try again later." : message);
    res.redirect("/listings");
});

app.listen(8080, (req, res) => {
    console.log("Server is lisning at port 8080");
});