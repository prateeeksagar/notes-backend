const moongose = require("mongoose");
const Schema = moongose.Schema;

const userSchema = new Schema({
  fullName: { type: String },
  email: { type: String },
  password: { type: String },
  createdOn: { type: Date, default: new Date().getTime() },
});

module.exports = moongose.model("User", userSchema);
