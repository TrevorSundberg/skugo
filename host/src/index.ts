import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import {getPageUrl, getWebSocketUrl} from "../../shared/urls";
import {RelaySocket} from "../../shared/relaySocket";
import WebSocket from "ws";
import os from "os";
import uniqid from "uniqid";
import pty = require("node-pty");

const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

const party = uniqid();
const pageUrl = `${getPageUrl()}?party=${party}`;
console.log(pageUrl);

const wsUrl = RelaySocket.getWebSocketUrl(getWebSocketUrl(), party, "host");
const rs = new RelaySocket(new WebSocket(wsUrl) as any);

rs.onPeerAdded = (_, peer) => {
  const ptyProcess = pty.spawn(shell, [], {
    cols: 80,
    cwd: process.cwd(),
    env: process.env,
    name: "xterm-color",
    rows: 24
  });

  peer.onRemoved = () => {
    ptyProcess.kill();
  };

  ptyProcess.on("data", (data) => {
    peer.send<MessageStream>({
      data,
      type: MessageType.Stream
    });
  });

  peer.onTunnelMessage = (tunnelMsg) => {
    const message = tunnelMsg.data as Message;
    switch (message.type) {
      case MessageType.Resize: {
        const msg = message as MessageResize;
        ptyProcess.resize(msg.cols, msg.rows);
        break;
      }

      case MessageType.Stream: {
        const msg = message as MessageStream;
        ptyProcess.write(msg.data);
        break;
      }
    }
  };
};
