import express from "express";
import Rooms from "../models/dbRooms"

let router=express.Router();

router.post('/new', (req, res) => {
    let roomid=req.body.roomid;
    const dbMessage = req.body;
    delete dbMessage.roomid;
    let query={ _id: roomid};
    Rooms.updateOne(query,{$push:{messages: dbMessage}}, (err, data) => {
        if (err) {
            res.status(500).send(err);
        }
        else {
            res.status(201).send(data);
        }
    })
})

module.exports=router;