require("dotenv").config()
var GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport')
const User = require('../models/user')
const uri = process.env.CALLBACK_URI || "http://localhost:3000/auth/google/callback"

const dayArr = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
let day = dayArr[new Date().getDay()]

passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: uri
},
    (accessToken, refreshToken, profile, done) => {
        User.find({ googleId: profile.id }).then((user) => {
            if (user.length > 0) {
                console.log(`Welcome back ${profile.name.givenName}`)
                done(null, user)
            } else {
                new User({
                    googleId: profile.id,
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    email: profile.emails[0].value,
                    picture: profile.photos[0].value,
                    lastUpdated: day,
                    daysSinceMiss: 0,
                    totalPlants: 0
                }).save()
                    .then(() => {
                        console.log('User created')
                        done(null, user)
                    })
            }
        })
    }
));