 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/public/js/socket.js b/public/js/socket.js
index 383b836f49cc6da01aa147962ad0d72bb7635aba..f7bdf5301d44f559441f2e29b4e5a552271bd855 100644
--- a/public/js/socket.js
+++ b/public/js/socket.js
@@ -1,29 +1,27 @@
 (function initSocketSingleton() {
-  if (window.socket) {
-    return;
-  }
+  if (window.socket) return;
 
-  const socket = io(window.location.origin, {
-    transports: ["websocket"],
+  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
+  const serverUrl = isLocal
+    ? `${window.location.protocol}//${window.location.host}`
+    : window.location.origin;
+
+  const socket = io(serverUrl, {
     path: "/socket.io",
+    transports: ["websocket", "polling"],
     withCredentials: false,
     reconnection: true,
     reconnectionAttempts: Infinity,
     reconnectionDelay: 500,
-    reconnectionDelayMax: 3000
+    reconnectionDelayMax: 3000,
+    timeout: 10000
   });
 
   window.socket = socket;
 
-  socket.on("connect", () => {
-    console.log("[socket] conectado", socket.id);
-  });
-
-  socket.on("disconnect", (reason) => {
-    console.warn("[socket] desconectado", reason);
-  });
-
+  socket.on("connect", () => console.log("[socket] conectado", socket.id));
+  socket.on("disconnect", (reason) => console.warn("[socket] desconectado", reason));
   socket.on("connect_error", (error) => {
     console.warn("[socket] erro de conexão", error?.message || error);
   });
 })();
 
EOF
)