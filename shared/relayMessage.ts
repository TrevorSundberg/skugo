export enum RelayMessageType {
  // To peers:
  PeerAdded,
  PeerRemoved,
  TunnelFailed,

  // From peers:
  TunnelMessage,
}

export type RelayAuthProvider = "google";

export interface RelayMessage {
  type: RelayMessageType;
}

export interface RelayPeerMessage extends RelayMessage {
  type: RelayMessageType.PeerAdded | RelayMessageType.PeerRemoved;

  id: number;

  state: any;

  verifiedEmail: string;
}

export interface RelayTunnelMessage extends RelayMessage {
  type: RelayMessageType.TunnelMessage;

  from?: number;

  to: number;

  encrypted: string;
}

export interface RelayTunnelFailed extends RelayMessage {
  type: RelayMessageType.TunnelFailed;

  message: RelayTunnelMessage;
}
