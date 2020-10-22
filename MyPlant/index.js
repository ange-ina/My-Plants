const express = require('express')
const app = express()
require('dotenv').config()
const mongoose = require('mongoose')
const port = process.env.PORT || 3000
const passportSetup = require('./config/passportSetup')
const passport = require('passport')
const cookieSession = require('cookie-session')
const User = require('./models/user')
const formidable = require("formidable");
const path = require("path");
const fs = require('fs')
const { timeStamp } = require('console')

app.use(cookieSession({
    name: 'session',
    maxAge: 24 * 60 * 60 * 1000,
    keys: [process.env.COOKIE_KEY]
}))

app.use(express.static('public'))
app.use(express.static("uploads"))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.set('view engine', 'ejs')
app.use(passport.initialize())
app.use(passport.session())

const dayArr = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"]
let day = dayArr[new Date().getDay()]

mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => {
        console.log("I am connect")
        app.listen(port, () => {
            console.log(`listening at http://localhost:${port}/`)
        })
    })
    .catch(err => console.log(err))


app.get('/', (req, res) => {
    res.status(200).render('index')
})
app.get('/house', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let totalPlants = 0
            for (i = 0; i < result[0].plants.length; i++) {
                totalPlants++
            }
            let newRooms = result[0].rooms
            for (i = 0; i < result[0].rooms.length; i++) {
                let room = result[0].rooms[i]
                let plantCounter = 0
                for (j = 0; j < result[0].plants.length; j++) {
                    if (result[0].plants[j].room === result[0].rooms[i].name) {
                        plantCounter++
                    }
                }
                room.plants = plantCounter
                newRooms[i] = room
            }
            let plantAuto = result[0].plants
            for (i = 0; i < plantAuto.length; i++) {
                if (plantAuto[i].moisture >= 300) {
                    plantAuto[i].needsWater = false
                    console.log("I'm here")
                    User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: plantAuto }, { useFindAndModify: false })
                        .catch(err => console.log(err))
                        .then(console.log("Auto updated"))
                } else if (plantAuto[i].moisture < 300) {
                    plantAuto[i].needsWater = true
                    console.log("Thirsty")
                    User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: plantAuto }, { useFindAndModify: false })
                        .catch(err => console.log(err))
                        .then(console.log("Auto updated"))
                }
            }
            if (result[0].lastUpdated != day) {
                let newPlants = result[0].plants
                let newMiss = result[0].daysSinceMiss
                let missCounter = 0
                let wateredCounter = 0
                for (i = 0; i < newPlants.length; i++) {
                    if (newPlants[i].schedule.includes(day)) {
                        newPlants[i].needsWater = true
                    } else if (!newPlants[i].schedule.includes(day) && newPlants[i].needsWater === false) {
                        wateredCounter++
                        missCounter++
                    } else if (!newPlants[i].schedule.includes(day)) {
                        missCounter++
                    }
                }
                if (wateredCounter === missCounter) {
                    newMiss++
                } else {
                    newMiss = 0
                }
                User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: newPlants, lastUpdated: day, daysSinceMiss: newMiss }, { useFindAndModify: false })
                    .catch(err => console.log(err))
                    .then(console.log("Watering needs updated"))
            }
            User.findOneAndUpdate({ googleId: req.user.googleId }, { totalPlants: totalPlants, rooms: newRooms }, { useFindAndModify: false })
                .catch(err => console.log(err))
                .then(console.log("Numbers Updated"))
            res.status(200).render('house', { data: result[0], today: day })
        })
})

app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google'), (req, res) => {
    res.redirect('/house')
})

app.get('/profile', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            res.status(200).render('profile', { user: result[0] })
        })
})

app.get('/logout', (req, res) => {
    req.logout()
    res.redirect('/')
})

app.get('/myHome', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            res.status(200).render('myHome', { data: result[0] })
        })
})

app.get('/room/:id', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let plants = []
            let room
            for (i = 0; i < result[0].rooms.length; i++) {
                if (result[0].rooms[i]._id == req.params.id) {
                    room = result[0].rooms[i]
                }
            }
            for (i = 0; i < result[0].plants.length; i++) {
                if (result[0].plants[i].room == room.name) {
                    plants.push(result[0].plants[i])
                }
            }
            res.status(200).render('room', { room: room, plants: plants })
        })
})

app.get('/plant/:id', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let plant
            for (i = 0; i < result[0].plants.length; i++) {
                if (result[0].plants[i]._id == req.params.id) {
                    plant = result[0].plants[i]
                }
            }
            res.status(200).render('plant', { plant: plant })
        })
})

app.post('/newRoom', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            if (result[0].rooms === undefined) {
                const newRooms = []
                let newRoom = req.body
                newRoom.plants = 0
                newRooms.push(newRoom)
                User.findByIdAndUpdate(result[0]._id, { rooms: newRooms }, { useFindAndModify: false })
                    .then((result) => {
                        console.log('Rooms updated')
                        res.status(201).redirect('/myHome')
                    })
            } else {
                const newRooms = result[0].rooms
                let newRoom = req.body
                newRoom.plants = 0
                newRooms.push(newRoom)
                User.findByIdAndUpdate(result[0]._id, { rooms: newRooms }, { useFindAndModify: false })
                    .then((result) => {
                        console.log('Rooms updated')
                        res.status(201).redirect('/myHome')
                    })
            }
        })
})

app.post('/newPlant/:id', (req, res, next) => {
    const form = formidable({
        multiples: true,
        uploadDir: "./uploads",
        keepExtensions: true,
    })
    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err);
            return;
        }
        if (files.pictureFile.size === 0) {
            fs.unlink(`./uploads/${path.basename(files.pictureFile.path)}`, () => {
                console.log("Unused file deleted")
            })
        }
        if (files.pictureCamera.size === 0) {
            fs.unlink(`./uploads/${path.basename(files.pictureCamera.path)}`, () => {
                console.log("Unused file deleted")
            })
        }
        let pathname = ''
        if (fields.pictureUrl.length > 0) {
            pathname = fields.pictureUrl
        } else if (files.pictureCamera.size > 0) {
            pathname = `/${path.basename(files.pictureCamera.path)}`
        } else if (files.pictureFile.size > 0) {
            pathname = `/${path.basename(files.pictureFile.path)}`
        }
        User.find({ googleId: req.user.googleId })
            .catch(err => console.log(err))
            .then((result) => {
                let resultRoom = ""
                let newRooms = result[0].rooms
                let room
                let newTotal = result[0].totalPlants + 1
                for (let i = 0; i < result[0].rooms.length; i++) {
                    if (result[0].rooms[i]._id == req.params.id) {
                        room = result[0].rooms[i]
                        resultRoom = room.name
                        room.plants++
                        newRooms[i] = room
                    }
                }
                if (result[0].plants === undefined) {
                    let newPlants = []
                    let newPlant = {
                        room: resultRoom,
                        name: fields.name,
                        species: fields.species,
                        picture: pathname,
                        schedule: fields.schedule,
                        needsWater: false
                    }
                    newPlants.push(newPlant)
                    User.findByIdAndUpdate(result._id, { plants: newPlants, rooms: newRooms, totalPlants: newTotal }, { useFindAndModify: false })
                        .catch(err => console.log(err))
                        .then(() => {
                            console.log('Plants updated')
                            res.status(200).redirect(`/room/${req.params.id}`)
                        })
                } else {
                    let newPlants = result[0].plants
                    let newPlant = {
                        room: resultRoom,
                        name: fields.name,
                        species: fields.species,
                        picture: pathname,
                        schedule: fields.schedule,
                        needsWater: false
                    }
                    newPlants.push(newPlant)
                    User.findByIdAndUpdate(result[0]._id, { plants: newPlants, rooms: newRooms, totalPlants: newTotal }, { useFindAndModify: false })
                        .catch(err => console.log(err))
                        .then(() => {
                            console.log('Plants updated')
                            res.status(200).redirect(`/room/${req.params.id}`)
                        })
                }
            })
    })
})

app.get('/waterPlant/:id', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let newPlants = result[0].plants
            for (i = 0; i < newPlants.length; i++) {
                if (newPlants[i]._id == req.params.id) {
                    newPlants[i].needsWater = false
                }
            }
            User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: newPlants }, { useFindAndModify: false })
                .catch(err => console.log(err))
                .then(console.log("plant watered"))
            res.redirect('/house')
        })
})

app.get('/deletePlant/:id', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let newPlants = result[0].plants
            let newTotal = result[0].totalPlants - 1
            for (i = 0; i < newPlants.length; i++) {
                if (newPlants[i]._id == req.params.id) {
                    newPlants.splice(i, 1)
                }
            }
            User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: newPlants, totalPlants: newTotal }, { useFindAndModify: false })
                .catch(err => console.log(err))
                .then(() => {
                    console.log("Plant deleted")
                    User.find({ googleId: req.user.googleId })
                        .catch(err => console.log(err))
                        .then((result) => {
                            let newRooms = result[0].rooms
                            for (i = 0; i < newRooms.length; i++) {
                                let room = newRooms[i]
                                let plantCounter = 0
                                for (j = 0; j < result[0].plants.length; j++) {
                                    if (result[0].plants[j].room === room.name) {
                                        plantCounter++
                                    }
                                }
                                room.plants = plantCounter
                                newRooms[i] = room
                            }
                            User.findOneAndUpdate({ googleId: req.user.googleId }, { rooms: newRooms }, { useFindAndModify: false })
                                .catch(err => console.log(err))
                                .then(() => {
                                    console.log("Plant count updated")
                                    res.status(201).redirect('/myHome')
                                })
                        })
                })
        })
})

app.post('/editPlant/:id', (req, res) => {
    User.find({ googleId: req.user.googleId })
        .catch(err => console.log(err))
        .then((result) => {
            let newPlants = result[0].plants
            for (i = 0; i < newPlants.length; i++) {
                if (newPlants[i]._id == req.params.id) {
                    let plant = newPlants[i]
                    let schedule = []
                    if (typeof req.body.schedule == "string") {
                        schedule.push(req.body.schedule)
                    } else {
                        for (j = 0; j < req.body.schedule.length; j++) {
                            schedule.push(req.body.schedule[j])
                        }
                    }
                    plant.name = req.body.name
                    plant.species = req.body.species
                    plant.picture = req.body.picture
                    plant.schedule = schedule
                    newPlants.splice(i, 1, plant)
                }
            }
            User.findOneAndUpdate({ googleId: req.user.googleId }, { plants: newPlants }, { useFindAndModify: false })
                .catch(err => console.log(err))
                .then(() => {
                    console.log("Plant updated")
                    res.redirect(`/plant/${req.params.id}`)
                })
        })
})
app.post('/api/station/:id', (req, res) => {
    User.findById(req.params.id)
        .catch(err => console.log(err))
        .then((result) => {
            let moist = req.body.Earth
            let plant = req.body.Plant
            let newPlants = result.plants
            for (i = 0; i < newPlants.length; i++) {
                if (newPlants[i]._id == plant) {
                    newPlants[i].moisture = moist
                }
            }
            User.findByIdAndUpdate(req.params.id, { plants: newPlants }, { useFindAndModify: false })
                .catch(err => console.log(err))
                .then(() => {
                    console.log('Moisture updated')
                    res.send("OK")
                })
        })
})
app.get('/*', (req, res) => {
    res.status(404).render('404')
})