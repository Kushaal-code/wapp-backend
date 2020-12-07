import express from "express";
import Rooms from "../models/dbRooms";
import Users from "../models/dbUsers";

let router=express.Router();

router.get('/sync', (req, res) => {
    let query = { _id: req.headers._id }
    console.log(req.headers._id)
    Users.findById(query, (err, data) => {
        if (err) {
            res.status(204).send(err);
        }
        else {
            //'participants','avatarURL name'
            let query = { _id: data.chatrooms };
            Rooms.find(query, { messages: { $slice: -1 } }).populate({
                path: 'participants',
                match: { _id: { $ne: req.headers._id } },
                select: 'name avatarURL -_id'
            })
                .exec((err, roomdata) => {
                    if (err) {
                        console.log(err);
                    }
                    else {
                       // console.log("Rooms:", roomdata);
                        res.status(200).send(roomdata);
                    }
                })
        }
    })
});

router.post('/new', (req, res) => {
    const dbRoom = req.body;
    console.log(req.body);
    let query = { participants: [req.body.participant1, req.body.participant2] };
    Rooms.create(query, (err, data) => {
        if (err) {
            res.status(500).send(err);
        }
        else {

            let query2 = { _id: req.body.participant1 }
            Users.updateOne(query2, { $push: { chatrooms: data._id } }, (err, data) => {
                if (err)
                    res.status(500).send(err);
                else
                    console.log("User 1 updated");
            })
            let query3 = { _id: req.body.participant2 }
            Users.updateOne(query3, { $push: { chatrooms: data._id } }, (err, data) => {
                if (err)
                    res.status(500).send(err);
                else
                    console.log("User 2 updated");
            })

            res.status(201).send(data);
        }
    });

})

router.get('/:id', (req, res) => {
    let query = { _id: req.params.id };
    Rooms.findOne(query).populate({
        path: 'participants',
        match: { _id: { $ne: req.headers._id } },
        select: 'name avatarURL -_id'
    }).exec((err,data)=>{
        if(err)
            res.status(500).send(err);
        else{
            console.log("Chat opened");
            res.status(200).send(data);
        }
    })

});

module.exports = router;