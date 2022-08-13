const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  id: {
        type: String,
        required: true
    },
  market_id: {
        type: String,
        required: true
    },
   team1:  {
        type: String,
        required: true
    },
  team2: {
        type: String,
        required: true
    },
   match_type: {
        type: String,
        required: true
    },
  insert_type: {
        type: String,
        required: true
    },
  date_time:{
        type: Date,
        required:true
    },
});
matchSchema.set('timestamps', true);
module.exports = mongoose.model('mcreate',matchSchema);
