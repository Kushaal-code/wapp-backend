import express from "express";
import mongoose from "mongoose";
import Rooms from "./models/dbRooms.js";
import Users from "./models/dbUsers.js";
import cors from "cors";
import { Server } from "socket.io";
import users from "./routes/users.js"
import rooms from "./routes/rooms.js";
import messages from "./routes/messages.js";


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

    
    const roomCollection = db.collection("chatrooms");
    const userCollection = db.collection("users");
    const pipeline = [
        { $project : {  operationType:1, updateDescription:1, fullDocument:{_id:1 ,participants:1, messages:{$arrayElemAt: [ "$fullDocument.messages", -1 ]} } }}
    ];
    //{ fullDocument: 'updateLookup' }
    const roomStream = roomCollection.watch(pipeline,{ fullDocument: 'updateLookup' });
    
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
            console.log("Error in roomsstream");
        }
    });
});



//app routes
app.get("/", (req, res) => res.status(200).send("Hello World"));

app.use('/users',users);
app.use('/rooms',rooms);
app.use('/messages',messages);



//AT7QZANyKP1T5t98