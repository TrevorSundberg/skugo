import {Deferred, sequence} from "./utility";
import {SshServer} from "./ssh";
import WebSocket from "ws";
import net from "net";
import {uuid} from "uuidv4";

const url = `wss://skugo.openode.io/${uuid()}`;
console.log(url);
const wsDefer = new Deferred<void>();
const ws = new WebSocket(url);
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
