import express from "express";
import Users from "../models/dbUsers.js";

let router = express.Router();

router.post('/search', (req, res) => {
    const search = req.body;
    Users.findOne(search, (err, data) => {
        if (err) {
            console.log(err)
            res.status(204).send(err);
        }
        else {
            res.status(200).send(data);
        }
    })
})

router.post('/add', (req, res) => {
    const user = req.body;
    Users.create(user, (err, data) => {
        if (err) {
            res.status(500).send(err);
        }
        else {
            res.status(201).send(data);
        }
    });
});

module.exports = router;