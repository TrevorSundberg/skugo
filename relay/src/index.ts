import {
  RelayAuthProvider,
  RelayMessage,
  RelayMessageType,
  RelayPeerMessage,
  RelayTunnelFailed,
  RelayTunnelMessage
} from "../../shared/relayMessage";
import WebSocket from "ws";
import googleClientId from "../../shared/googleClientId.json";

const wss = new WebSocket.Server({
  port: 80
}, () => console.log("Relay server started"));

class Peer {
  public id: number;

  public state: any;

  public ws: WebSocket;

  public verifiedEmail: string;

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
      type: RelayMessageType.PeerAdded,
      verifiedEmail: peer.verifiedEmail
    });
  }

  public sendPeerRemoved (peer: Peer) {
    this.send<RelayPeerMessage>({
      id: peer.id,
      state: peer.state,
      type: RelayMessageType.PeerRemoved,
      verifiedEmail: peer.verifiedEmail
    });
  }
}

class Connection {
  public peers: Peer[] = [];

  private idCounter = 0;

  public addPeer (state: any, ws: WebSocket, verifiedEmail: string): Peer {
    const peer = new Peer();
    peer.id = this.idCounter++;
    peer.state = state;
    peer.ws = ws;
    peer.verifiedEmail = verifiedEmail;
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

const parties: Record<string, Connection> = {};

wss.on("connection", async (ws, request) => {
  const {socket} = request;
  const searchParams = new URLSearchParams(request.url.slice(1));
  const party = searchParams.get("party");
  const stateStr = searchParams.get("state");
  const state = JSON.parse(stateStr);
  let cleanup = () => null;
  const close = (reason: string) => {
    console.log(`Closed ${socket.remoteAddress}:${socket.remotePort} ${party} ${stateStr}: ${reason}`);
    ws.close(1000, reason);
    cleanup();
  };
  if (!party) {
    close("Both party and state are required");
    return;
  }

  const authToken = searchParams.get("authToken");
  const authProvider = searchParams.get("authProvider") as RelayAuthProvider;
  if (Boolean(authProvider) !== Boolean(authToken)) {
    close("The authProvider and authToken must be provided together or not at all");
    return;
  }
  let verifiedEmail = "";
  if (authProvider === "google") {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${authToken}`);
    const json = await response.json();
    if (json.aud === googleClientId) {
      if (json.email_verified === "true") {
        // eslint-disable-next-line prefer-destructuring
        verifiedEmail = json.email;
      }
    } else {
      close("Invalid client id");
      return;
    }
  } else {
    close("Invalid auth provider");
    return;
  }

  console.log(`Connected ${socket.remoteAddress}:${socket.remotePort} ${party} ${stateStr}`);
  const connection = parties[party] || new Connection();
  const peer = connection.addPeer(state, ws, verifiedEmail);
  parties[party] = connection;
  cleanup = () => {
    connection.removePeer(peer);
    if (connection.peers.length === 0) {
      delete parties[party];
    }
  };

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

  ws.on("close", () => close("Disconnected"));
  ws.on("error", () => close("Error"));
});
