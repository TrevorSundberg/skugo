import WebSocket from "ws";

const wss = new WebSocket.Server({
  port: 80
});

const pairs: Record<string, WebSocket[]> = {};

wss.on("connection", (ws, request) => {
  const {socket} = request;
  const searchParams = new URLSearchParams(request.url.slice(1));
  const id = searchParams.get("id");
  if (!id) {
    console.log(`Rejected ${socket.remoteAddress}:${socket.remotePort} (no id)`);
    ws.close(1000, "No id provided");
    return;
  }
  console.log(`Connected ${socket.remoteAddress}:${socket.remotePort} with id ${id}`);
  const sockets = pairs[id] || [];
  sockets.push(ws);
  pairs[id] = sockets;

  ws.on("message", (data) => {
    for (const otherSocket of sockets) {
      if (otherSocket !== ws) {
        if (otherSocket.readyState === WebSocket.OPEN) {
          otherSocket.send(data);
          console.log(data);
        }
      }
    }
  });

  const onClose = () => {
    console.log(`Disconnected ${socket.remoteAddress}:${socket.remotePort} with id ${id}`);
    ws.close();
    const index = sockets.indexOf(ws);
    if (index !== -1) {
      sockets.splice(index, 1);
    }

    if (sockets.length === 0) {
      delete pairs[id];
      console.log(`All connections for ${id} closed`);
    }
  };

  ws.on("close", onClose);
  ws.on("error", onClose);
});
