const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({                                       
    id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    match_id:  {
        type: String,
        required: true
    },
    mode: {
        type: String,
        required: true
    },
    amount:  {
        type: Number,
        required: true
    },
    rate: {
        type: Number,
        required: true
    },
    profit: {
        type: Number,
        required: true
    },
    loss: {
        type: Number,
        required: true
    },
    active: {
        type: Number,
        required: true
    },
});
matchSchema.set('timestamps', true);
module.exports = mongoose.model('bid',matchSchema);