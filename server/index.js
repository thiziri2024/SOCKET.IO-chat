require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const Message = require("./models/Message");
const User = require("./models/User");
const Group = require("./models/Group");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connecté à MongoDB Atlas'))
  .catch(err => console.error('❌ Erreur MongoDB:', err));

// ---------------------- helper ----------------------
function normalizeMembers(arr) {
  return [...new Set(arr.map(e => String(e).trim().toLowerCase()))].sort();
}
// --------------------------------------------------

// ---------------- REST : messages & group ----------------
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

app.get("/messages/group/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// find or create a group for an exact set of members
app.post("/groups/check-or-create", async (req, res) => {
  try {
    const { members } = req.body;
    if (!Array.isArray(members) || members.length < 2) {
      return res.status(400).json({ message: "members must be an array with at least 2 emails" });
    }
    const normalized = normalizeMembers(members);
    let group = await Group.findOne({ members: normalized });
    if (!group) {
      group = new Group({ name: `Groupe-${Date.now()}`, members: normalized });
      await group.save();
    }
    res.json(group);
  } catch (err) {
    console.error("❌ /groups/check-or-create", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

app.get("/users", async (_, res) => {
  const users = await User.find();
  res.json(users);
});
app.get("/groups", async (_, res) => {
  const groups = await Group.find();
  res.json(groups);
});
app.post("/groups", async (req, res) => {
  try {
    const { name, members } = req.body;
    const group = new Group({ name, members: normalizeMembers(members) });
    await group.save();
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Erreur création groupe" });
  }
});
// ------------------------------------------------------------

// ---------------- Socket.io realtime ----------------
const userSocketMap = {}; // userId -> socketId

io.on("connection", (socket) => {
  console.log("🔌 Utilisateur connecté :", socket.id);

  socket.on("register", (userIdRaw) => {
    const userId = String(userIdRaw).trim().toLowerCase();
    userSocketMap[userId] = socket.id;

    Object.keys(userSocketMap).forEach(id => {
      if (id !== userId && userSocketMap[id]) {
        io.to(userSocketMap[id]).emit("userOnline", { userId });
      }
    });

    const onlineUsers = Object.keys(userSocketMap).filter(id => id !== userId);
    socket.emit("onlineUsers", onlineUsers);
  });

  // ✅ Amélioration : joinGroup avec historique
  socket.on("joinGroup", async ({ groupId, userId }) => {
    try {
      if (!groupId) return;
      socket.join(groupId);
      console.log(`socket ${socket.id} a rejoint la room groupe ${groupId} (user ${userId})`);

      // send all previous messages of this group to this socket
      const messages = await Message.find({ groupId }).sort({ createdAt: 1 });
      socket.emit("receiveGroupHistory", { groupId, messages });

    } catch (err) {
      console.error("joinGroup error", err);
    }
  });

  socket.on("sendMessage", async ({ senderId, receiverId, text }) => {
    try {
      const newMsg = new Message({ senderId, receiverId, text, read: false });
      const saved = await newMsg.save();
      socket.emit("receiveMessage", saved);
      const receiverSocket = userSocketMap[String(receiverId).trim().toLowerCase()];
      if (receiverSocket) io.to(receiverSocket).emit("receiveMessage", saved);
    } catch (err) {
      console.error("❌ Erreur sendMessage:", err);
    }
  });

  socket.on("sendGroupMessage", async ({ senderId, groupId, text }) => {
    try {
      if (!groupId) return;
      const newMsg = new Message({ senderId, groupId, text, read: false });
      const saved = await newMsg.save();
      io.to(groupId).emit("receiveMessage", saved);
    } catch (err) {
      console.error("❌ Erreur sendGroupMessage:", err);
    }
  });

  socket.on("typing", ({ sender, receiver, groupId, isTyping }) => {
    try {
      if (groupId) {
        socket.to(groupId).emit("typing", { sender, isTyping, groupId });
      } else if (receiver) {
        const receiverSocket = userSocketMap[String(receiver).trim().toLowerCase()];
        if (receiverSocket) io.to(receiverSocket).emit("typing", { sender, isTyping });
      }
    } catch (err) {
      console.error("typing error", err);
    }
  });

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
    const found = Object.entries(userSocketMap).find(([u, sId]) => sId === socket.id);
    if (found) {
      const disconnectedUser = found[0];
      delete userSocketMap[disconnectedUser];
      socket.broadcast.emit("userOffline", { userId: disconnectedUser });
    }
  });
});
// ---------------------------------------------------------

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
