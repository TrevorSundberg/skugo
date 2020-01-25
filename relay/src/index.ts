import {Deferred, sequence} from "../../shared/utility";
import WebSocket from "ws";

const wss = new WebSocket.Server({
  port: 80
}, () => console.log("Relay server started"));

class Peer {
  public ws: WebSocket;

  public promise = new Deferred<void>();
}

class Connection {
  private peers: [Peer, Peer] = [
    new Peer(),
    new Peer()
  ]

  public readonly sendToOther: (wsFrom: WebSocket, data: WebSocket.Data) => void;

  public constructor () {
    this.sendToOther = sequence(async (wsFrom: WebSocket, data: WebSocket.Data) => {
      console.log("Received data", data);
      const otherPeer = this.peers[0].ws === wsFrom ? this.peers[1] : this.peers[0];
      await otherPeer.promise;
      if (otherPeer.ws.readyState === WebSocket.OPEN) {
        otherPeer.ws.send(data);
        console.log("Forwarded data", data);
      }
    });
  }

  public addPeer (ws: WebSocket) {
    const emptyPeer = this.peers.find((peer) => !peer.ws);
    if (!emptyPeer) {
      return false;
    }
    emptyPeer.ws = ws;
    emptyPeer.promise.resolve();
    return true;
  }
}

const pairs: Record<string, Connection> = {};

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
  const connection = pairs[id] || new Connection();
  if (!connection.addPeer(ws)) {
    console.log(`Rejected ${socket.remoteAddress}:${socket.remotePort} (two already connected)`);
    ws.close(1000, "Two peers already connected");
    return;
  }
  pairs[id] = connection;

  ws.on("message", (data) => {
    connection.sendToOther(ws, data);
  });

  const onClose = () => {
    console.log(`Disconnected ${socket.remoteAddress}:${socket.remotePort} with id ${id}`);
    ws.close();
    delete pairs[id];
  };

  ws.on("close", onClose);
  ws.on("error", onClose);
});
