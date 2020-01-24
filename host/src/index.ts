import os from "os";
import ssh2 from "ssh2";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pty: typeof import("node-pty") = require("node-pty");

const key =
"-----BEGIN RSA PRIVATE KEY-----\n" +
"Proc-Type: 4,ENCRYPTED\n" +
"DEK-Info: DES-EDE3-CBC,5B362E12FBCC015B\n" +
"\n" +
"UudNbVMs/HxUM+K8YIZFt3i7rh/sdekj7vS6bHe6XlevjQ0qQ00qCNvru2BCJIDv\n" +
"rQqUIAu2pHQ/MymUSgfTtl36a+UGdrXD16owhTUgG/H7bUe10s3ANg2vWov3/pwZ\n" +
"l+fo4S4J9f/UzIG4IX5E6TzvOPb3Fb97An1pVjGGW3EXS+7WvKr01j+Ii6H1IsNF\n" +
"mnMMcQiuTTcCJYJN8JdG0/x0hdKZs0Ia35HJZeQ1Ktftt1ZRit6fuol5UAgOGjxX\n" +
"wQVoMQNpcuOSwajfVGgJK3LGVYiRv/O+OIHEy372klkKbW4gL8OSjt7dYGeqM4uY\n" +
"3yVZFMcXDi7ZfaepNBkAECje1Two798/K9nW5V2STAtOmlCUR0QzI6O0SSbuwUMD\n" +
"G0+DvgENmXgZRu78+OmkFMyDcmt83rQxkgukfQ5Uv49xjynLffxlGMC3jgHNp7Dw\n" +
"FoBsD20bih7iIrA/gSbccfiVc4UXn52DMoYGECgP0rrtDv4lqix2VY+mmgWuZ/1F\n" +
"6ZBPUfgH45V55OF1+n70rSeOrs9sVD79YTPgUdR0/FXxkyAade8huLkoB1Q+F2oo\n" +
"Zy1FpZP185vxVNo5CZ+4GDQyBGY07xitXDsFNwjiqhrr4J/AsMhGmamD+IfVa7iG\n" +
"pRbh2QO3ITNwKAG/DNsv5bHGqzIwv+i6+CAVLZC9EbueiJm4YSa8pBjUV3vNBwZq\n" +
"J1ipAQLi9WK6F9flhBj+BUbUnoc7cueXFwE2HOTwQJ2E6iQYEchxfQ5x3rpQ7HXx\n" +
"0hJ5BvZiCYfnDdDGbRK/sLCZsmOkvgEhohENla417umc4PumwNZGahH68Eeted1E\n" +
"Ysakbq0tbZSKfM56mPnU9gZ3nbclAtwIF9ZSUPhapmPeNbDwvFuXFkx+YoVrBn6h\n" +
"vRM9D1bq4A3EP+NPK6qUE/mTz0fRY+kIaJSeSE6Aw+j71palLV+vXtgyJFMrR8Hm\n" +
"YeY16IAf7c1ihawrU+rdlShes4sfERnXmxzLAgoO7sG3y/3wNIJcP+pFRK5xAH3K\n" +
"S4OO+ubp3UDJKp11PvMV3hckUmeBrrbeaDe9gzAcgcS7kTc/hfTN318y/cFgtMUy\n" +
"EvHALrByn5yP8siRInj4M0OSC32PCzazVoXGtUWK5iQAmihGnM+GWuYluHU78fqt\n" +
"Odhv1VjK7D2EuA3BqNq4ihZD8VPj75yEnNsGoTZC52gZQu9i4xzT91W2gbr6ne/4\n" +
"WMb+NUW0+kP+16awM4bGT/f+sM4Odq4BLnvbyuFXgdLL0We4dF3RjTft7tCThRvv\n" +
"T/0IBO1cdel71xODcdltG+Z2C8zyP7nRmzKXnzKoeyBZSZiD9gzCfUwPHdXVKCMF\n" +
"VbMt5UOhyYQMyW/WyM4bVRLmWT3vs0xyozPomS1d0ow0SL2QDNrvtAkNnXvPi9UG\n" +
"ZpH+JwFix/IQuTsWwLxWT/4UV/3mJpfd5JXAU6ss5X1RqxiHz+7C4TG2qaYI+05U\n" +
"YfL3A0AcKdvNNw7ocYeDJOCnTsqiI7NzHkdPSlbv1+GKuLUp3oMTYNTxY1z34lhV\n" +
"yyX4kRnyk1yG3pWIheObkWHqS/q6VSgjh++REQrLrTybqNC7ukaeKQ==\n" +
"-----END RSA PRIVATE KEY-----\n";

const server = new ssh2.Server({
  hostKeys: [{key, passphrase: "test"}]
});

server.on("connection", (client) => {
  client.on("authentication", (ctx) => {
    ctx.accept();
  });

  client.on("session", (accept) => {
    const session = accept();
    session.on("pty", (acceptPty, reject, info) => {
      acceptPty();

      const shell = os.platform() === "win32" ? "powershell.exe" : "bash";

      const ptyProcess = pty.spawn(shell, [], {
        cols: info.cols,
        cwd: process.cwd(),
        env: process.env,
        name: "xterm-color",
        rows: info.rows
      });

      session.on("shell", (acceptShell) => {
        const stream = acceptShell();
        stream.on("data", (data) => {
          ptyProcess.write(data);
        });
        ptyProcess.on("data", (data) => {
          process.stdout.write(data);
          stream.write(data);
        });
      });
    });
  });
});

server.listen(0, "127.0.0.1", () => {
  console.log(`Listening on port ${server.address().port}`);
});
