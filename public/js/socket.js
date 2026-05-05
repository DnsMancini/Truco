const socket = io();

socket.on("connect", () => {
  console.log("conectado:", socket.id);
});

export default socket;