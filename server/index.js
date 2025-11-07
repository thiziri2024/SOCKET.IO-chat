const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" } // permet toutes les connexions pour tester
});

io.on('connection', (socket) => {
    console.log('Un client est connecté !');

    socket.on('chat message', (msg) => {
        console.log('Message reçu :', msg);
        io.emit('chat message', msg); // renvoie à tous
    });
});

server.listen(3000, () => console.log("Serveur lancé sur le port 3000"));
