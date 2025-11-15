import mongoose from "mongoose";

const ConversationsSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["privée", "groupe"], 
    default: "privée" 
  },

  participants: [{ 
    type: String,       // ⭐ très important → String, pas ObjectId 
    required: true 
  }],

  lastMessage: { 
    type: String,       // ⭐ ID du message (String)
    default: null 
  },

  groupName: { 
    type: String 
  },

  groupPic: { 
    type: String, 
    default: "" 
  },

  createdBy: { 
    type: String        // ⭐ ID de l’utilisateur
  },

  createdAt: { 
    type: Date, 
    default: Date.now 
  },

  lastActivity: { 
    type: Date, 
    default: Date.now 
  },
});

// Index pour accélérer recherche de conversations
ConversationsSchema.index({ participants: 1 });

export const Conversation = mongoose.model("Conversations", ConversationsSchema);
