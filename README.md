# Introducing skugo
Generate a unique shareable link and securely remote into a machine via web interface; think SSH!

![Run skugo in a terminal](./readme/terminal.gif)
![Open the generated link in a browser](./readme/browser.gif)

# How it works

To avoid the need for having a publicly visible machine or opening ports,
skugo uses WebSockets on both client browser and hosting machine to connect 
to a relay server that's hosted on [Openode](https://www.openode.io/).
When running skugo it will generate a unique session using [uniqid](https://www.npmjs.com/package/uniqid).
Anyone who has the link will join the same session and can execute commands on the hosting machine.

# Security

Both client browser and hosting machine connect to the relay server over HTTPS (TLS/SSL) ensuring your traffic is encrypted.
To further enhance security, the underlying protocol is encrypted with CryptoJS's AES-256.
The pass-phrase is cryptographically generated and is included as a base64 encoded hash in the url, e.g. `#4LGDmmkcysPtqaXyho1Ikg==`.
By using the hash, it ensures that only the client sees it (location hashes are never sent to the server by any browser).
This end to end encryption has two advantages:
- Even though the relay receives your data and forwards it, it cannot decrypt it (privacy!)
- If anyone were to compromise the relay server, they cannot control your machine without breaking the AES-256.

# Running on Linux

## wget:
```
wget -qO- https://github.com/TrevorSundberg/skugo/releases/latest/download/skugo-linux-x64.tar.xz | tar xJf -
./skugo
```

## curl:
```
curl -sL https://github.com/TrevorSundberg/skugo/releases/latest/download/skugo-linux-x64.tar.xz | tar xJf -
./skugo
```

## npm:
```
npm install -g skugo
skugo
```
