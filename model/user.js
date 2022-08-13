const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    uid: {type:String, default:null},
    first_name: { type: String, required:true },
    last_name: { type: String, required:true },
    status:{type:String, default:'Active'},
    contact_no:{type:String, default:null},
    role: { type: String, default: "user" },
    email: { type: String,required:true, unique: true },
    password: { type: String },
    members: {},
    createdBy: { type:String, required:true},
    reference: {type:String, default:null},
    token: { type: String },
    wallet: { type: Number, default: 0},
    limit: {type:Number, default:'0'},
    share: {type:Number, default:'0'},
    cassinoShare: {type:Number, default:'0'},
    cassinoCommission: {type:Number, default:'0'},
    cassinoStatus: {type:Number, default: '0'},
    commissionType:{type:String},
    matchCommission:{type:Number, default:'0'},
    sessionCommission:{type:Number, default :'0'}
});
userSchema.set('timestamps', true);
module.exports = mongoose.model("user", userSchema);