const socket = io(window.location.origin, {
  transports: ["websocket"],
  path: "/socket.io",
  withCredentials: false
});

window.trucoSocket = socket;

socket.on("connect", () => {
  console.log("[socket] conectado", socket.id);
});

socket.on("connect_error", (error) => {
  console.warn("[socket] erro de conexão", error?.message || error);
});
