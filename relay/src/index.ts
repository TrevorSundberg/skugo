import WebSocket from "ws";

const wss = new WebSocket.Server({
  port: 80
});

const pairs: Record<string, WebSocket[]> = {};

wss.on("connection", (socket, request) => {
  const searchParams = new URLSearchParams(request.url.slice(1));
  const id = searchParams.get("id");
  console.log(`Connection from ${request.socket.remoteAddress}:${request.socket.remotePort} with id ${id}`);
  if (!id) {
    socket.close(1000, "No id provided");
    return;
  }
  const sockets = pairs[id] || [];
  sockets.push(socket);
  pairs[id] = sockets;

  socket.on("message", (data) => {
    for (const otherSocket of sockets) {
      if (otherSocket !== socket) {
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(data);
          console.log(data);
        }
      }
    }
  });

  const onClose = () => {
    socket.close();
    const index = sockets.indexOf(socket);
    if (index !== -1) {
      sockets.splice(index, 1);
    }

    if (sockets.length === 0) {
      delete pairs[id];
    }
  };

  socket.on("close", onClose);
  socket.on("error", onClose);
});
