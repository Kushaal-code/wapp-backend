import mongoose from 'mongoose';
const Schema=mongoose.Schema;
const roomschema=mongoose.Schema({
    participants: [ {type: Schema.Types.ObjectId, ref: 'users', unique: true} ],
    messages: [{
        sender: {type: Schema.Types.ObjectId, ref: 'users'},
        message: String,
        timestamp: {type: Schema.Types.Number}
    }]
});

export default mongoose.model('chatrooms', roomschema);