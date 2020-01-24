import WebSocket from "ws";

const wss = new WebSocket.Server({
  port: 80
});

const pairs: Record<string, WebSocket[]> = {};

wss.on("connection", (socket, request) => {
  const {url} = request;
  const sockets = pairs[url] || [];
  sockets.push(socket);
  pairs[url] = sockets;

  socket.on("message", (data) => {
    for (const otherSocket of sockets) {
      if (otherSocket !== socket) {
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(data);
        }
      }
    }
  });

  socket.on("close", () => {
    socket.close();
    const index = sockets.indexOf(socket);
    if (index !== -1) {
      sockets.splice(index, 1);
    }

    if (sockets.length === 0) {
      delete pairs[url];
    }
  });
});
