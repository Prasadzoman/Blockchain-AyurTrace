const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: ["collector", "transporter", "processing_plant", "lab_testing", "consumer"],
    required: true
  }
});

// plugin adds hash + salt fields, and helper methods
UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", UserSchema);
