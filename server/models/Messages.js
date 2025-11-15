import mongoose from "mongoose";

const MessagesSchema = new mongoose.Schema({
  id_conversation: { type: String, required: true },   // FIX 
  id_sender: { type: String, required: true },         // FIX 

  typeMessage: {
    type: String,
    enum: ["text", "image", "video", "audio", "file", "sticker"],
    default: "text",
  },

  content: String,     // texte
  media: String,       // vocal, image, fichier base64

  isDeleted: { type: Boolean, default: false },

  readBy: [{ type: String }],   // FIX : plus ObjectId

  status: {
    type: String,
    enum: ["sent", "delivered", "seen"],
    default: "sent",
  },

  time: { type: Date, default: Date.now },
});

// Index pour charger plus vite
MessagesSchema.index({ id_conversation: 1, time: -1 });

export const Message = mongoose.model("Messages", MessagesSchema);
