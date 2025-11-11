const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    conversationId: { type: String, default: null }, // optionnel
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

module.exports = mongoose.model("Message", messageSchema);


//Ce modèle permet d’enregistrer chaque message avec l’expéditeur (senderId), le destinataire (receiverId), le texte et la date