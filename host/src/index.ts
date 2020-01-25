import {Deferred, sequence} from "./utility";
import {getPageUrl, getWebSocketUrl} from "../../shared";
import {SshServer} from "./ssh";
import WebSocket from "ws";
import net from "net";
import {uuid} from "uuidv4";

const id = uuid();
const wsUrl = `${getWebSocketUrl()}?id=${id}`;
const pageUrl = `${getPageUrl()}?id=${id}`;
console.log(pageUrl);
const wsDefer = new Deferred<void>();
const ws = new WebSocket(wsUrl);
const ssh = new SshServer();

const proxyDefer = new Deferred<void>();
const proxy = new net.Socket();

ws.on("message", async (data) => {
  await proxyDefer;
  proxy.write(data as Buffer);
});

proxy.on("data", sequence(async (data) => {
  await wsDefer;
  ws.send(data);
}));

ws.on("open", () => {
  wsDefer.resolve();
  console.log("WebSocket connected");
});

ssh.server.listen(0, "127.0.0.1", () => {
  proxy.connect(ssh.server.address().port, "127.0.0.1", () => {
    proxyDefer.resolve();
    console.log("SSH server ready");
  });
});
