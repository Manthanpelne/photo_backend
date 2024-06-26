const express = require("express");
const jwt = require("jsonwebtoken")
const app = express();
const { connection } = require("./db");
const passport = require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy
require("dotenv").config();
const session = require('express-session');
const { authentication } = require("./middleware/Authentication")
const cors = require("cors");



app.use(
  cors({
    origin: "*",
    preflightContinue: true
  })
);


app.use(async(req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "DELETE, POST, GET, PATCH, PUT, OPTIONS"
  ),
  res.header(
    "Access-Control-Allow-Credentials",
    "true"
  ),
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
  next();
});

// const redis = new Redis({
  //     port:process.env.port,
  //     host:process.env.redisURL,
  //     username:process.env.username,
  //     password:process.env.password,
  // })

  const {createClient} = require("redis")

  const client = createClient({
    password:process.env.password,
    socket: {
        host: process.env.redisURL,
        port: process.env.redis_port
    }
  });
client.connect(()=>console.log("Redis connected"))



// const { authorise } = require("../middleware/Authorization")
const { UserModel } = require("./models/user.model")
const { photographyRouter } = require("./routes/photographer.route");
const { UserRoute } = require("./routes/user.route");
const { BlacklistModel } = require("./models/blacklist.model")
const { appointmentRouter } = require("./routes/appointment.route")

app.use(session({
  secret: "my-secret-key",
  resave: false,
  saveUninitialized: false
}));



app.use(express.json());
app.use("/photographer",photographyRouter);
app.use("/appointment", appointmentRouter)


app.use("/User", UserRoute)

app.use(passport.initialize())
app.use(passport.session());
require("./OAuth")


app.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }))
app.use("/User", UserRoute)

app.get("/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), async (req, res) => {
  const { id, displayName, emails } = req.user;
  // let usr= await UserModel.find({ "email": req.user.emails[0].value })
  const users = new UserModel({ firstName:req.user._json.given_name , lastName:req.user._json.family_name, mobileNo:"00000" , email:req.user._json.email , password:"SignUp with Google OAuth" , role:"User" })
  await users.save()

  let usr = await UserModel.find({ "email": req.user._json.email })
  console.log(req.user._json.email)
  console.log(usr)
  const token = jwt.sign({ userId: usr[0]._id }, 'imran', { expiresIn: '1h' });
  client.set("token", token)
  console.log({ "token": token })
  console.log({ "mail": req.user.emails[0].value })
  res.redirect('http://127.0.0.1:5500/frontend/index.html');
  res.end({ "token": token })

})





app.get("/users",authentication,async (req, res) => {
  try {
    const data = await UserModel.find()
    res.send(data)
  } catch (error) {
    res.send(error)
  }
})

app.post("/block", async (req, res) => {
  const token = await req.cookies.Token
  try {
    let data = new BlacklistModel({ token })
    await data.save()
    res.send({ "msg": "Blacklist added", token })
  } catch (error) {
    res.send(error)
  }
})

app.listen(process.env.port, async () => {
  try {
    await connection;
    console.log("connected to db");
  } catch (err) {
    console.log(err);
  }
});
