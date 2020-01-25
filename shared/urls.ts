export const isDev = typeof location === "undefined" ? process.env.NODE_ENV === "dev" : location.protocol === "http:";

if (isDev) {
  console.log("Development Environment");
}

export type PeerType = "host" | "client";

export const getWebSocketUrl = (id: string, type: PeerType) => {
  const url = new URL(isDev ? "ws://localhost:80/" : "wss://skugo.openode.io/");
  url.searchParams.set("id", id);
  url.searchParams.set("type", type);
  return url.href;
};

export const getPageUrl = () => isDev ? "http://localhost:8080/" : "https://trevorsundberg.github.io/skugo/";
