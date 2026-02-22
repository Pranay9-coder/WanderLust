const express = require("express");
const mongoose = require("mongoose");
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

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

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

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);

const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expire: Date.now() + 7*24*60*60*1000,//days*hrs*min*sec*milisec
        maxAge: 7*24*60*60*1000,
        httpOnly: true,
    },
};

app.get("/", (req, res) => {
    res.send("Root is working");
});

app.use(session(sessionOptions));
app.use(flash());

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

// app.get("/demouser", async(req, res) =>{
//     let fakeUser = new User({
//         email:"student@gmail.com",
//         username: "delta-student"
//     });
//     let registeredUser = await User.register(fakeUser, "helloworld"); //.registration(user,password,)
//     res.send(registeredUser);
// });

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Fallback for all unmatched routes
app.use((req, res, next) => {
    next(new ExpressError(404, "Page not Found"));
});

app.use((err, req, res, next) => {
    const { statusCode = 500, message = "Something went wrong" } = err;
    req.flash("error", message);
    res.redirect("/listings");
});

app.listen(8080, (req, res) => {
    console.log("Server is lisning at port 8080");
});