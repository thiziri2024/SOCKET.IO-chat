import dotenv from "dotenv";
dotenv.config();

import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";

import { User } from "./models/Users.js";
import { Conversation } from "./models/Conversations.js";
import { Message } from "./models/Messages.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL, methods: ["GET", "POST"] },
});

app.use(express.json());

// --- MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

app.get("/", (_, res) => res.send("Backend OK"));

// ---------------- SOCKET.IO ----------------
const onlineUsers = {}; // email -> socket.id

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // ---- USER CONNECT ----
  socket.on("register", (email) => {
    const norm = email.trim().toLowerCase();
    onlineUsers[norm] = socket.id;
    io.emit("onlineUsers", Object.keys(onlineUsers));
  });

  // ---- USER DISCONNECT ----
  socket.on("disconnect", () => {
    const user = Object.keys(onlineUsers).find(u => onlineUsers[u] === socket.id);
    if (user) delete onlineUsers[user];
    io.emit("onlineUsers", Object.keys(onlineUsers));
  });

  // ---- START / JOIN CONVERSATION ----
  socket.on("start_conversation", async ({ participants, groupName }) => {
    try {
      const normalized = [...new Set(participants.map(e => e.trim().toLowerCase()))].sort();
      if (normalized.length < 2) return;

      let conv = await Conversation.findOne({ participants: normalized });

      if (!conv) {
        conv = await Conversation.create({
          participants: normalized,
          type: normalized.length > 2 ? "groupe" : "privée",
          groupName: normalized.length > 2 ? `Groupe-${Date.now()}` : "",
          createdBy: normalized[0],
          lastActivity: new Date()
        });
      }

      // Join room
      socket.join(conv._id.toString());

      // Envoyer conversation créée
      socket.emit("conversation_created", conv);

      // Envoyer historique
      const history = await Message.find({ id_conversation: conv._id.toString() }).sort({ time: 1 });
      socket.emit("conversation_history", { conversationId: conv._id.toString(), messages: history });

    } catch (err) {
      console.error("Conversation error:", err);
      socket.emit("error", { message: "Impossible de créer/rejoindre la conversation" });
    }
  });

  socket.on("join_conversation", ({ conversationId }) => {
    if (conversationId) socket.join(conversationId);
  });

  // ---- SEND MESSAGE ----
  socket.on("send_message", async ({ conversationId, senderId, content }) => {
    try {
      if (!conversationId || !senderId || !content) return;

      const msg = await Message.create({
        id_conversation: conversationId,
        id_sender: senderId,
        typeMessage: "text",
        content,
        status: "sent"
      });

      io.to(conversationId).emit("receive_message", msg);

      await Conversation.findByIdAndUpdate(conversationId, { lastActivity: new Date() });
    } catch (err) {
      console.error("send_message error:", err);
    }
  });

  // ---- TYPING ----
  socket.on("typing", ({ conversationId, senderId, isTyping }) => {
    if (!conversationId || !senderId) return;
    socket.to(conversationId).emit("typing", { sender: senderId, isTyping });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
