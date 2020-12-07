import mongoose from 'mongoose';
const Schema=mongoose.Schema;
const userschema=mongoose.Schema({
    email: String,
    name: String,
    avatarURL: String,
    chatrooms: [ {type: Schema.Types.ObjectId, ref: 'chatrooms'} ]
});

export default mongoose.model('users', userschema);