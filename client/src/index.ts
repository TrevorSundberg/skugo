import "xterm/css/xterm.css";
import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import {FitAddon} from "xterm-addon-fit";
import {RelaySocket} from "../../shared/relaySocket";
import {SearchAddon} from "xterm-addon-search";
import {Terminal} from "xterm";
import {WebLinksAddon} from "xterm-addon-web-links";
import {getWebSocketUrl} from "../../shared/urls";

const searchParams = new URLSearchParams(location.search);
const party = searchParams.get("party");
if (!party) {
  throw new Error("No party provided");
}
const wsUrl = RelaySocket.getWebSocketUrl(getWebSocketUrl(), party, "client");
const rs = new RelaySocket(new WebSocket(wsUrl));
rs.onPeerAdded = (addedMsg, peer) => {
  if (addedMsg.state === "host") {
    const terminal = new Terminal();
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(new SearchAddon());
    const fitAddon = new FitAddon();
    window.addEventListener("resize", () => fitAddon.fit());
    terminal.loadAddon(fitAddon);
    terminal.resize(80, 24);
    terminal.open(document.getElementById("terminal"));

    peer.onTunnelMessage = (tunnelMsg) => {
      const message = tunnelMsg.data as Message;
      switch (message.type) {
        case MessageType.Stream: {
          const msg = message as MessageStream;
          terminal.write(msg.data);
          break;
        }
      }
    };

    terminal.onData((data) => {
      peer.send<MessageStream>({
        data,
        type: MessageType.Stream
      });
    });

    terminal.onResize(({cols, rows}) => {
      peer.send<MessageResize>({
        cols,
        rows,
        type: MessageType.Resize
      });
    });
    fitAddon.fit();
  }
};
