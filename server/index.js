require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const Message = require("./models/Message");
const User = require("./models/User");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connecté à MongoDB Atlas'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// Récupération de l'historique
app.get("/messages/:user1/:user2", async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

const userSocketMap = {}; // userId → socketId

io.on("connection", (socket) => {
  console.log("🔌 Utilisateur connecté :", socket.id);

  // enregistrer utilisateur
  socket.on("register", (userId) => {
    userSocketMap[userId] = socket.id;
    console.log("📥 Register:", userId, "=>", socket.id);
  });

  // envoyer message
  socket.on("sendMessage", async (data) => {
    try {
      const { senderId, receiverId, text } = data;
      const newMsg = new Message({ senderId, receiverId, text, read: false });
      const saved = await newMsg.save();

      // message renvoyé à l'expéditeur
      socket.emit("receiveMessage", saved);

      // message transmis au destinataire
      const receiverSocket = userSocketMap[receiverId];
      if (receiverSocket) {
        io.to(receiverSocket).emit("receiveMessage", saved);
      }
    } catch (err) {
      console.error("❌ Erreur sendMessage:", err);
    }
  });

  // marquer dernier message comme lu
  socket.on("markAsRead", async ({ reader, other }) => {
    try {
      const lastMsg = await Message.findOne(
        { senderId: other, receiverId: reader, read: false },
        {},
        { sort: { createdAt: -1 } }
      );
      if (!lastMsg) return;
      lastMsg.read = true;
      await lastMsg.save();

      const otherSocket = userSocketMap[other];
      if (otherSocket) io.to(otherSocket).emit("messageReadByOther", { lastMsgId: lastMsg._id });
      const readerSocket = userSocketMap[reader];
      if (readerSocket) io.to(readerSocket).emit("messageReadByOther", { lastMsgId: lastMsg._id });
    } catch (err) {
      console.error("❌ Erreur markAsRead:", err);
    }
  });

  socket.on("disconnect", () => {
    for (const [id, sId] of Object.entries(userSocketMap)) {
      if (sId === socket.id) {
        delete userSocketMap[id];
        break;
      }
    }
    console.log("🔌 Utilisateur déconnecté :", socket.id);
  });
});

// route test
app.get("/users", async (_, res) => {
  const users = await User.find();
  res.json(users);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
