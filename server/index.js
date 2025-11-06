const express = require('express');     // 1 création du serveur complet avc javascript
const app = express()                   // 2 à l'aide de express qui rend la création (ces 2 lignes) tres simple 
const http = require("http");
const cors = require("cors"); 
const {Server} = require("socket.io");
const { Socket } = require('dgram');
app.use(cors());

const server = http.createServer(app);      //3eme ligne de la creation du serveur avc node et la bibliotheque express

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"],
    },
});

io.on("connection", () => {    //le serveur écoute les événements : “message envoyé”
    console.log("user disconnected", socket.id);     

    Socket.on("disconnect", () => {           //le client envoie des événements : “message reçu”
        console.log("user disconnected", socket.id);
    });
});     //Ce code dit : dès qu’un utilisateur envoie un message, tout le monde connecté reçoit le message en direct.


server.listen(3001, ()=> {
    console.log("server running");
});
