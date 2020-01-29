import {
  RelayMessage,
  RelayMessageType,
  RelayPeerMessage,
  RelayTunnelFailed,
  RelayTunnelMessage
} from "./relayMessage";
import CryptoJS from "crypto-js";

export class RelayPeer {
  public readonly socket: RelaySocket;

  public readonly msg: RelayPeerMessage;

  public onRemoved: (msg: RelayPeerMessage) => void;

  public onTunnelMessage: (msg: RelayTunnelMessage, data: any) => void;

  public onTunnelFailed: (msg: RelayTunnelFailed) => void;

  public send<T extends any> (data: T) {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), this.socket.secret).toString();
    const msg: RelayTunnelMessage = {
      encrypted,
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

  public readonly secret: string;

  public onPeerAdded: (msg: RelayPeerMessage, peer: RelayPeer) => void;

  public onPeerRemoved: (msg: RelayPeerMessage, peer: RelayPeer) => void;

  public onTunnelMessage: (msg: RelayTunnelMessage, peer: RelayPeer, data: any) => void;

  public onTunnelFailed: (msg: RelayTunnelFailed, peer: RelayPeer) => void;

  public readonly peers: Record<number, RelayPeer> = {};

  public static getWebSocketUrl (hostUrl: string, party: string, state: any) {
    const url = new URL(hostUrl);
    url.searchParams.set("party", party);
    url.searchParams.set("state", JSON.stringify(state));
    return url.href;
  }

  public constructor (ws: WebSocket, secret: string) {
    this.ws = ws;
    this.secret = secret;

    this.ws.addEventListener("message", (event) => {
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
          const data = JSON.parse(CryptoJS.AES.decrypt(msg.encrypted, this.secret).toString(CryptoJS.enc.Utf8));
          if (peer.onTunnelMessage) {
            peer.onTunnelMessage(msg, data);
          }
          if (this.onTunnelMessage) {
            this.onTunnelMessage(msg, peer, data);
          }
          break;
        }
      }
    });
  }
}
