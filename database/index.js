const mongoose = require('mongoose');

const dbURI = process.env.MONGO_URI;
mongoose.connect(dbURI, {
    useNewUrlParser : true , useUnifiedTopology : true
})
    .then(() => console.log("Connected to DB"))
    .catch((err) => console.log(err));