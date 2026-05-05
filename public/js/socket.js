(function initSocketSingleton() {
  if (window.socket) {
    return;
  }

  const socket = io(window.location.origin, {
    transports: ["websocket"],
    path: "/socket.io",
    withCredentials: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000
  });

  window.socket = socket;

  socket.on("connect", () => {
    console.log("[socket] conectado", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[socket] desconectado", reason);
  });

  socket.on("connect_error", (error) => {
    console.warn("[socket] erro de conexão", error?.message || error);
  });
})();
