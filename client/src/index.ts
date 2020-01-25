import "xterm/css/xterm.css";
import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import {FitAddon} from "xterm-addon-fit";
import {SearchAddon} from "xterm-addon-search";
import {Terminal} from "xterm";
import {WebLinksAddon} from "xterm-addon-web-links";
import {getWebSocketUrl} from "../../shared/urls";

const terminal = new Terminal();
terminal.loadAddon(new WebLinksAddon());
terminal.loadAddon(new SearchAddon());
const fitAddon = new FitAddon();
terminal.loadAddon(fitAddon);
terminal.resize(80, 24);
terminal.open(document.getElementById("terminal"));

const searchParams = new URLSearchParams(location.search);
if (!searchParams.get("id")) {
  throw new Error("No id provided");
}
const wsUrl = `${getWebSocketUrl()}?id=${searchParams.get("id")}`;
const ws = new WebSocket(wsUrl);
ws.addEventListener("open", () => {
  const send = <T extends Message>(msg: T) => {
    ws.send(JSON.stringify(msg));
  };

  ws.addEventListener("message", async (event) => {
    const message = JSON.parse(event.data as string) as Message;
    switch (message.type) {
      case MessageType.Stream: {
        const msg = message as MessageStream;
        terminal.write(msg.data);
        break;
      }
    }
  });

  terminal.onData((data) => {
    send<MessageStream>({
      data,
      type: MessageType.Stream
    });
  });

  terminal.onResize(({cols, rows}) => {
    console.log(cols, rows);
    send<MessageResize>({
      cols,
      rows,
      type: MessageType.Resize
    });
  });
  fitAddon.fit();
});

window.addEventListener("resize", () => fitAddon.fit());
