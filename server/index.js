const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Quand un client se connecte :
io.on("connection", (socket) => {
    console.log("Un utilisateur est connecté :", socket.id);

    socket.on("disconnect", () => {
    console.log("Un utilisateur s'est déconnecté :", socket.id);
    });
});

app.get("/", (req, res) => {
    res.send("Le serveur Socket.io fonctionne !");
});

server.listen(3001, () => {
    console.log("Serveur en écoute sur le port 3001");
});
