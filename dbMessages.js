import mongoose from 'mongoose';
const wappschema=mongoose.Schema({
    message: String,
    name: String,
    timestamp: String,
    received: Boolean
});

export default mongoose.model('messagecontents', wappschema);