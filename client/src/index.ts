import "xterm/css/xterm.css";
import {SearchAddon} from "xterm-addon-search";
import {Terminal} from "xterm";
import {WebLinksAddon} from "xterm-addon-web-links";

const terminal = new Terminal();
terminal.loadAddon(new WebLinksAddon());
terminal.loadAddon(new SearchAddon());

terminal.open(document.getElementById("terminal"));
terminal.write("Hello from \x1B[1;3;31mxterm.js\x1B[0m $ ");
terminal.onKey((e: { key: string; domEvent: KeyboardEvent }) => {
  const ev = e.domEvent;
  const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

  if (ev.keyCode === 8) {
    // Do not delete the prompt
    // eslint-disable-next-line no-underscore-dangle
    if ((terminal as any)._core.buffer.x > 2) {
      terminal.write("\b \b");
    }
  } else if (printable) {
    terminal.write(e.key);
  }
});
