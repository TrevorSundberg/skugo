import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import {getPageUrl, getWebSocketUrl} from "../../shared/urls";
import WebSocket from "ws";
import os from "os";
import {uuid} from "uuidv4";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty: typeof import("node-pty") = require("node-pty");

const id = uuid();
const wsUrl = `${getWebSocketUrl()}?id=${id}`;
const pageUrl = `${getPageUrl()}?id=${id}`;
console.log(pageUrl);
const ws = new WebSocket(wsUrl);

ws.on("open", () => {
  console.log("WebSocket connected");

  const send = <T extends Message>(msg: T) => {
    ws.send(JSON.stringify(msg));
  };

  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
  const ptyProcess = pty.spawn(shell, [], {
    cols: 80,
    cwd: process.cwd(),
    env: process.env,
    name: "xterm-color",
    rows: 24
  });

  ws.on("message", async (data) => {
    const message = JSON.parse(data as string) as Message;
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
  });

  ptyProcess.on("data", (data) => {
    send<MessageStream>({
      data,
      type: MessageType.Stream
    });
  });
});
