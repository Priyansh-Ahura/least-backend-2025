let io;

module.exports = {
    init: (httpServer) => {
        io = require("socket.io")(httpServer);
        console.log("Socket.io initialized!");
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error("Socket.io not initialized!");
        }
        return io;
    },
};
