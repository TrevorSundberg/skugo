import {
  RelayMessage,
  RelayMessageType,
  RelayPeerMessage,
  RelayTunnelFailed,
  RelayTunnelMessage
} from "../../shared/relayMessage";
import WebSocket from "ws";

const wss = new WebSocket.Server({
  port: 80
}, () => console.log("Relay server started"));

class Peer {
  public id: number;

  public state: any;

  public ws: WebSocket;

  public send<T extends RelayMessage> (message: T): boolean {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  public sendPeerAdded (peer: Peer) {
    this.send<RelayPeerMessage>({
      id: peer.id,
      state: peer.state,
      type: RelayMessageType.PeerAdded
    });
  }

  public sendPeerRemoved (peer: Peer) {
    this.send<RelayPeerMessage>({
      id: peer.id,
      state: peer.state,
      type: RelayMessageType.PeerRemoved
    });
  }
}

class Connection {
  private peers: Peer[] = [];

  private idCounter = 0;

  public addPeer (state: any, ws: WebSocket): Peer {
    const peer = new Peer();
    peer.id = this.idCounter++;
    peer.state = state;
    peer.ws = ws;
    for (const otherPeer of this.peers) {
      otherPeer.sendPeerAdded(peer);
      peer.sendPeerAdded(otherPeer);
    }
    this.peers.push(peer);
    return peer;
  }

  public removePeer (peer: Peer) {
    const index = this.peers.indexOf(peer);
    if (index === -1) {
      throw new Error("Peer not found");
    }
    this.peers.splice(index, 1);
    for (const otherPeer of this.peers) {
      otherPeer.sendPeerRemoved(peer);
    }
  }

  public tunnelMessage (from: Peer, message: RelayTunnelMessage) {
    message.from = from.id;
    const to = this.peers.find((peer) => peer.id === message.to);
    const sent = to && to.send(message);

    if (!sent) {
      from.send<RelayTunnelFailed>({
        message,
        type: RelayMessageType.TunnelFailed
      });
    }
  }
}

const pairs: Record<string, Connection> = {};

wss.on("connection", (ws, request) => {
  const {socket} = request;
  const searchParams = new URLSearchParams(request.url.slice(1));
  const party = searchParams.get("party");
  const stateStr = searchParams.get("state");
  const state = JSON.parse(stateStr);
  const close = (reason: string) => {
    console.log(`Closed ${socket.remoteAddress}:${socket.remotePort} ${party} "${stateStr}": ${reason}`);
    ws.close(1000, reason);
  };
  if (!party) {
    close("Both party and state are required");
    return;
  }
  console.log(`Connected ${socket.remoteAddress}:${socket.remotePort} ${party} "${stateStr}"`);
  const connection = pairs[party] || new Connection();
  const peer = connection.addPeer(state, ws);
  pairs[party] = connection;

  ws.on("message", (data) => {
    if (typeof data !== "string") {
      close("Expected string data");
      return;
    }
    const message = JSON.parse(data) as RelayMessage;
    if (typeof message !== "object") {
      close("Expected parsed object message");
      return;
    }
    switch (message.type) {
      case RelayMessageType.TunnelMessage: {
        const msg = message as RelayTunnelMessage;
        if (msg.from) {
          close("The field 'from' must not exist");
          break;
        }
        connection.tunnelMessage(peer, message as RelayTunnelMessage);
        break;
      }
      default: {
        close(`Unexpected relay message type ${message.type}`);
        break;
      }
    }
  });

  const onClose = () => {
    close("Disconnected");
    delete pairs[party];
  };

  ws.on("close", onClose);
  ws.on("error", onClose);
});
