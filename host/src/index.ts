import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import {getPageUrl, getWebSocketUrl} from "../../shared/urls";
import {RelaySocket} from "../../shared/relaySocket";
import os from "os";
import {uuid} from "uuidv4";
import pty = require("node-pty");

const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

const party = uuid();
const pageUrl = `${getPageUrl()}?party=${party}`;
console.log(pageUrl);

const rs = new RelaySocket(getWebSocketUrl(), party, "host");

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
