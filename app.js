const express = require("express");
const path = require("path")
const session = require('express-session');
const bodyparser = require("body-parser");
const bcrypt = require("bcrypt"); // Import the bcrypt library
const mongoose = require('mongoose');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');


const app = express();
const port = 8001;
// Generate a random string for session secret key
const sessionSecretKey = crypto.randomBytes(32).toString('hex');

// Use the session middleware after defining sessionSecretKey
app.use(session({
  secret: sessionSecretKey,
  resave: false,
  saveUninitialized: true,
}));

// Use cookieParser middleware
app.use(cookieParser());
console.log('Generated session secret key:', sessionSecretKey);
// Express Specific stuff 
app.use('/static', express.static('static')) // For serving static files
app.use(express.urlencoded({ extended: true }))

// PUG Specific stuff
app.set('view engine', 'pug') // To set the template engine as pug 
app.set('views', path.join(__dirname, 'views')) // To set the viewer directory 

async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/icoder');
}

main().catch(err => console.log(err));

const contactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  address: String,
  email: String,
  message: String
});

const signupSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: { type: String, unique: true },
  password: String,
  confirmpassword: String,
});

// Define the user schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model('User', userSchema);
const Contact = mongoose.model('contact', contactSchema);
const signupModel = mongoose.model('signup', signupSchema);

app.get("/", (req, res) => {
  let params = {};
  res.status(200).render("home.pug", params);
});
app.get("/base.pug", (req, res) => {
  let params = {};
  res.status(200).render("base.pug", params);
});

app.get("/topics.pug", (req, res) => {
  let params = {};
  res.status(200).render("topics.pug", params);
});

app.get("/contact.pug", (req, res) => {
  let params = {};
  res.status(200).render("contact.pug", params);
});

app.post("/contact", (req, res) => {
  var myData = new Contact(req.body);
  myData.save().then(() => {
    res.send("Your form has been successfully submitted. Thank you for contacting us.");
  }).catch(() => {
    res.status(400).send("Your form was not submitted.");
  });
});

app.post("/signup", async (req, res) => {
  const { name, phone, email, password, confirmpassword } = req.body;

  // Check if password and confirmPassword match
  if (password !== confirmpassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const myData = new signupModel({
    name,
    phone,
    email,
    password: hashedPassword,
    confirmpassword
  });

  myData.save().then(() => {
    res.send("Your form has been successfully submitted. Thank you for signing up.");
  }).catch(() => {
    res.status(400).send("Your form was not submitted.");
  });
});


// Handle login form submission
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log("Received login request. Email:", email);

    // Find the user by email (case-insensitive) in the signupModel
    const user = await signupModel.findOne({ email: { $regex: new RegExp(email.trim(), 'i') } });

    console.log("User found:", user);

    // If user not found or password does not match, return an error
    if (!user || !(await bcrypt.compare(password, user.password))) {
      console.log("Invalid credentials. User:", user);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Successful login
    const isLoggedIn = true;
    const loginAlert = 'You have successfully logged in!';

    // Save the session
    req.session.isLoggedIn = isLoggedIn;
    req.session.loginAlert = loginAlert;
    await req.session.save(); // Save the session before rendering

    // Log the values for debugging
    console.log("isLoggedIn:", req.session.isLoggedIn);
    console.log("loginAlert:", req.session.loginAlert);

    // Render the home template with the session data
    res.status(200).render("home", {
      isLoggedIn: req.session.isLoggedIn || false,
      loginAlert: req.session.loginAlert || 'You have logged in successfully',
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ... (Other routes)

app.listen(port, () => {
  console.log(`The server is running successfully on port ${port}`);
});
