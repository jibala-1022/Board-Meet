const mongoose = require('mongoose');

const codeSchema = new mongoose.Schema({
    email: {
        type: mongoose.SchemaTypes.String,
        required : true,
        unique : true
    },
    code: {
        type: mongoose.SchemaTypes.String,
        required : true,
    },

} , { timestamps : true , expireAfterSeconds: 30}) ;

module.exports = mongoose.model('Code' , codeSchema);