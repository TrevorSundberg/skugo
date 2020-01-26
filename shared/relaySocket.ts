import {
  RelayMessage,
  RelayMessageType,
  RelayPeerMessage,
  RelayTunnelFailed,
  RelayTunnelMessage
} from "./relayMessage";

export class RelayPeer {
  public readonly socket: RelaySocket;

  public readonly msg: RelayPeerMessage;

  public onRemoved: (msg: RelayPeerMessage) => void;

  public onTunnelMessage: (msg: RelayTunnelMessage) => void;

  public onTunnelFailed: (msg: RelayTunnelFailed) => void;

  public send<T extends any> (data: T) {
    const msg: RelayTunnelMessage = {
      data,
      to: this.msg.id,
      type: RelayMessageType.TunnelMessage
    };
    this.socket.ws.send(JSON.stringify(msg));
  }

  public constructor (socket: RelaySocket, msg: RelayPeerMessage) {
    this.socket = socket;
    this.msg = msg;
  }
}

export class RelaySocket {
  public readonly ws: WebSocket;

  public onPeerAdded: (msg: RelayPeerMessage, peer: RelayPeer) => void;

  public onPeerRemoved: (msg: RelayPeerMessage, peer: RelayPeer) => void;

  public onTunnelMessage: (msg: RelayTunnelMessage, peer: RelayPeer) => void;

  public onTunnelFailed: (msg: RelayTunnelFailed, peer: RelayPeer) => void;

  public readonly peers: Record<number, RelayPeer> = {};

  public static getWebSocketUrl (hostUrl: string, party: string, state: any) {
    const url = new URL(hostUrl);
    url.searchParams.set("party", party);
    url.searchParams.set("state", JSON.stringify(state));
    return url.href;
  }

  public constructor (ws: WebSocket) {
    this.ws = ws;

    this.ws.addEventListener("message", async (event) => {
      const message = JSON.parse(event.data as string) as RelayMessage;
      switch (message.type) {
        case RelayMessageType.PeerAdded: {
          const msg = message as RelayPeerMessage;
          const peer = new RelayPeer(this, msg);
          this.peers[msg.id] = peer;
          if (this.onPeerAdded) {
            this.onPeerAdded(msg, peer);
          }
          break;
        }
        case RelayMessageType.PeerRemoved: {
          const msg = message as RelayPeerMessage;
          const peer = this.peers[msg.id];
          if (peer.onRemoved) {
            peer.onRemoved(msg);
          }
          if (this.onPeerRemoved) {
            this.onPeerRemoved(msg, peer);
          }
          delete this.peers[msg.id];
          break;
        }
        case RelayMessageType.TunnelMessage: {
          const msg = message as RelayTunnelMessage;
          const peer = this.peers[msg.from];
          if (peer.onTunnelMessage) {
            peer.onTunnelMessage(msg);
          }
          if (this.onTunnelMessage) {
            this.onTunnelMessage(msg, peer);
          }
          break;
        }
      }
    });
  }
}
