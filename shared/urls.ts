export const isDev = typeof location === "undefined" ? process.env.NODE_ENV === "dev" : location.protocol === "http:";

if (isDev) {
  console.log("Development Environment");
}

export const getWebSocketUrl = () => isDev ? "ws://localhost:80/" : "wss://skugo.openode.io/";

export const getPageUrl = () => isDev ? "http://localhost:8080/" : "https://skugo.dev/";
