const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: mongoose.SchemaTypes.String,
        required : true,
        unique : true
    },
    name: {
        type: mongoose.SchemaTypes.String,
        required : true,
    },
    password: {
        type: mongoose.SchemaTypes.String,
        required : true,
    },
    verified: {
        type: mongoose.SchemaTypes.Boolean,
        required : true
    },
} , { timestamps : true}) ;

module.exports = mongoose.model('User' , userSchema);