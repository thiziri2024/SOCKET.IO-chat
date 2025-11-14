const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    name: { type: String, required: true },            // nom du groupe
    members: [{ type: String, required: true }],       // emails des membres
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Group", groupSchema);
