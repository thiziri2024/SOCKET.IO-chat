const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
    conversationId: { type: String, default: null },
    senderId: { type: String, required: true },
    receiverId: { type: String, default: null },
    groupId: { type: String, default: null },
    text: { type: String, required: true },
    read: { type: Boolean, default: false }
    },
  { timestamps: true } // 👈 UNIQUE AMÉLIORATION AJOUTÉE
);

module.exports = mongoose.model("Message", messageSchema);
