export enum MessageType {
  // Client to host:
  Resize,

  // Bidirectional:
  Stream,
}

export interface Message {
  type: MessageType;
}

export interface MessageResize extends Message {
  type: MessageType.Resize;

  cols: number;

  rows: number;
}

export interface MessageStream extends Message {
  type: MessageType.Stream;

  data: string;
}
