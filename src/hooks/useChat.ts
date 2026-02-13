// hooks/useChat.ts
import { useEffect, useState, useRef, useCallback } from "react";
import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

type Message = { label: string; message: string };

export const useChat = (secretKey: string, roomId: string | null) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  const secretKeyRef = useRef(secretKey);

  useEffect(() => {
    secretKeyRef.current = secretKey;
  }, [secretKey]);

  useEffect(() => {
    // 1. Don't connect if no Room ID is set
    if (!roomId) return;

    // 2. Attach Room ID to URL
    const wsUrl = `ws://localhost:8080?room=${roomId}`;
    // const wsUrl = `https://chat-room-be-4.onrender.com?room=${roomId}`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setSocket(ws);
      console.log(`Connected to room: ${roomId}`);
    };

    ws.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        return;
      }

      if (
        parsed.type === "server" &&
        parsed.message === "Session ended by user."
      ) {
        setRejection("Session ended.");
        ws.close();
        return;
      }
      if (parsed.type === "assign") {
        setUserLabel(parsed.label);
        return;
      }
      if (parsed.type === "chat") {
        let decryptedMessage = parsed.message;
        try {
          const bytes = AES.decrypt(parsed.message, secretKeyRef.current);
          const originalText = bytes.toString(enc);
          if (originalText) decryptedMessage = originalText;
        } catch {
          decryptedMessage = "🔒 Encrypted Message (Wrong Key)";
        }
        setMessages((prev) => [
          ...prev,
          { label: parsed.label, message: decryptedMessage },
        ]);
        return;
      }
      if (parsed.type === "typing") setOtherIsTyping(parsed.status);
      if (parsed.type === "server" && parsed.message === "Room is full.") {
        setRejection("Room is full.");
        ws.close();
      }
    };

    ws.onclose = () => {
      setSocket(null);
    };

    return () => ws.close();
  }, [roomId]); // Re-connect only if Room ID changes

  const sendMessage = useCallback(
    (text: string) => {
      if (text.trim() && socket) {
        const encrypted = AES.encrypt(text, secretKeyRef.current).toString();
        socket.send(encrypted);
      }
    },
    [socket],
  );

  const sendTyping = useCallback(
    (status: boolean) => {
      if (socket) socket.send(JSON.stringify({ type: "typing", status }));
    },
    [socket],
  );

  const disconnectAll = () =>
    socket?.send(JSON.stringify({ type: "disconnect_all" }));
  const clearChat = () => setMessages([]);

  return {
    socket,
    messages,
    userLabel,
    rejection,
    otherIsTyping,
    sendMessage,
    sendTyping,
    disconnectAll,
    clearChat,
  };
};
