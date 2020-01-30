import "bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import "xterm/css/xterm.css";
import {Message, MessageResize, MessageStream, MessageType} from "../../shared/message";
import $ from "jquery";
import {FitAddon} from "xterm-addon-fit";
import {Modal} from "./modal";
import {RelaySocket} from "../../shared/relaySocket";
import {SearchAddon} from "xterm-addon-search";
import {Spinner} from "./spinner";
import {Terminal} from "xterm";
import {WebLinksAddon} from "xterm-addon-web-links";
import {getWebSocketUrl} from "../../shared/urls";

const searchParams = new URLSearchParams(location.search);
const party = searchParams.get("party");
if (!party) {
  Modal.messageBox("Error", "No party provided in the link", false);
  throw new Error("No party provided in the link");
}
const secret = location.hash.substr(1);
if (!secret) {
  Modal.messageBox("Error", "No secret provided in the link", false);
  throw new Error("No secret provided in the link");
}

const spinner = new Spinner();

const wsUrl = RelaySocket.getWebSocketUrl(getWebSocketUrl(), party, "client");
const ws = new WebSocket(wsUrl);
const onDisconnect = () => {
  spinner.hide();
  Modal.messageBox(
    "Disconnected",
    $("<p>You have been disconnected from the server. " +
      "Click <a href='javascript:location.reload(true)'>here</a> to retry.</p>"),
    false
  );
};
ws.addEventListener("close", onDisconnect);
ws.addEventListener("error", onDisconnect);

const rs = new RelaySocket(ws, secret);
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

    peer.onTunnelMessage = (tunnelMsg, message: Message) => {
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
    spinner.hide();
  }
};
