const mongoose = require('mongoose')
const Schema = mongoose.Schema

const plantSchema = new Schema({
    room: String,
    name: String,
    species: String,
    picture: String,
    schedule: Array,
    needsWater: Boolean,
    moisture: Number,
    automated: Boolean
})

const roomSchema = new Schema({
    name: String,
    plants: Number,
})

const userSchema = new Schema({
    googleId: String,
    firstName: String,
    lastName: String,
    email: String,
    picture: String,
    lastUpdated: String,
    daysSinceMiss: Number,
    totalPlants: Number,
    rooms: [roomSchema],
    plants: [plantSchema],
})

const User = mongoose.model('user', userSchema)
module.exports = User