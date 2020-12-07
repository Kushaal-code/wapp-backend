import express from "express";
import mongoose from "mongoose";
import Messages from "./dbMessages.js";
import Rooms from "./dbRooms.js";
import Users from "./dbUsers.js";
import Pusher from "pusher";
import cors from "cors";
import { Server } from "socket.io";


const app = express();
const port = process.env.PORT || 9000;
const appserver=app.listen(port, () => console.log(`Listening on localhost:${port}`));


//Socket.io
const io=new Server(appserver,{
    cors: {
        methods: ["GET", "POST"]
    }
});
io.on('connection',socket=>{
    socket.on('login',(id)=>{
        
        console.log(`User: ${id}`);
        socket.join(id,()=>{
            console.log("JOINNNNEEEEDD")
        });
        console.log("A user connected________________",socket.adapter.rooms);
        console.log("ROOOOMS",io.sockets.adapter.rooms);
    })
    socket.on('logout',(id)=>{
        console.log(`LOGOUT: ${id}`);
        socket.leave(id);
    })
    socket.on('disconnect',socket=>{
        console.log("User left");
    })
})

const pusher = new Pusher({
    appId: '1092666',
    key: 'afe6a0c7b4b7b2f1114b',
    secret: 'c2b589dc6e4e77a0a42c',
    cluster: 'ap2',
    encrypted: true
});


//Middlewares
app.use(express.json());
app.use(cors());

//DB Config

const connection_url = 'mongodb+srv://admin:AT7QZANyKP1T5t98@cluster0.ttdl2.mongodb.net/wappdb?retryWrites=true&w=majority';
mongoose.connect(connection_url, {
    useCreateIndex: true,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;

db.once("open", () => {
    console.log("DB connected...");

    const msgCollection = db.collection("messagecontents");
    const roomCollection = db.collection("chatrooms");
    const userCollection = db.collection("users");
    const pipeline = [
        { $project : {  operationType:1, updateDescription:1, fullDocument:{_id:1 ,participants:1, messages:{$arrayElemAt: [ "$fullDocument.messages", -1 ]} } }}
    ];
    //{ fullDocument: 'updateLookup' }
    const roomStream = roomCollection.watch(pipeline,{ fullDocument: 'updateLookup' });
    const changeStream = msgCollection.watch();
    roomStream.on("change", (change) => {
        //console.log("A change occured roomStrean: ", change);

        if(change.operationType == 'update'){
            console.log("Change is:",change.fullDocument);
            change.fullDocument.messages.roomId=change.fullDocument._id
            io.to(`${change.fullDocument.participants[0]}`).to(`${change.fullDocument.participants[1]}`).emit('newmessage',change.fullDocument.messages);
            console.log("MAAAAPSSS:::",io.sockets.adapter.rooms);
            //.to(change.fullDocument.participants[1])
            //console.log(io.eio);
        }
        else if (change.operationType == 'insert') {
            const roomDetails = change.fullDocument;
            let query = { _id: change.fullDocument._id };
            Rooms.find(query).populate({
                path: 'participants',
                select: 'name avatarURL -_id'
            }).exec((err, roomdata) => {
                if (err) {
                    console.log(err);
                }
                else {
                    const roomdatap1=JSON.parse(JSON.stringify(roomdata[0]));
                    const roomdatap2=JSON.parse(JSON.stringify(roomdata[0]));;
                    delete roomdatap1.participants[0];
                    console.log("P1:",roomdatap1.participants);
                    console.log("P2: ", roomdatap2.participants);
                    io.to(`${roomDetails.participants[0]}`).emit('newroom',roomdatap1);
                    //const roomdatap2=roomdata;
                    delete roomdatap2.participants[1];
                    io.to(`${roomDetails.participants[1]}`).emit('newroom',roomdatap2);
                   console.log("Rooms:", roomdata);
                   //io.in(`${roomDetails.participants[0]}`).emit('newroom',roomdata);
                }
            })
        } else {
            console.log("Error in rooms pusher trigger");
        }
    });
    changeStream.on("change", (change) => {
        console.log("A change occured: ", change);

        if (change.operationType == 'insert') {
            const messageDetails = change.fullDocument;
            pusher.trigger('messages', 'inserted', {
                name: messageDetails.name,
                message: messageDetails.message,
                received: messageDetails.received
            });
        } else {
            console.log("Error in message pusher trigger");
        }
    });
});




//app routes
app.get("/", (req, res) => res.status(200).send("Hello World"));

app.post('/users/add', (req, res) => {
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

app.post('/users/search', (req, res) => {
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

app.get('/rooms/sync', (req, res) => {
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
app.get('/messages/sync', (req, res) => {
    Messages.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        }
        else {
            res.status(200).send(data);
        }
    })
});
app.post('/rooms/new', (req, res) => {
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
app.post('/messages/new', (req, res) => {
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
app.get('/rooms/:id', (req, res) => {
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


//AT7QZANyKP1T5t98