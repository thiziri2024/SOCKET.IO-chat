const express = require('express');
const app = express()
const http = require("http");
const cors = require("cors"); 
const {server} = require("socket.io");
const { Socket } = require('dgram');
app.use(cors());

const server = http.createServer(app);

const io = new server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET","POST"],
    },
});

io.on("connection", () => {
    console.log(Socket.id);

    Socket.on("disconnect", () => {
        console.log("user disconnected", Socket.id);
    });
});


server.listen(3001, ()=> {
    console.log("server running");
});
