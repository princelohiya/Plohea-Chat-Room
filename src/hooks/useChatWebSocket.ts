import { useEffect, useRef, useState } from "react";

export function useChatWebSocket() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<
    { label: string; message: string }[]
  >([]);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => setSocket(ws);

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        if (parsed.type === "assign") setUserLabel(parsed.label);
        if (parsed.type === "chat") setMessages((m) => [...m, parsed]);
        if (parsed.type === "typing") {
          setOtherIsTyping(parsed.status);
          if (typingTimeout.current) clearTimeout(typingTimeout.current);
          typingTimeout.current = setTimeout(
            () => setOtherIsTyping(false),
            1500
          );
        }
      } catch {
        setMessages((m) => [...m, { label: "?", message: event.data }]);
      }
    };

    ws.onclose = () => setSocket(null);

    return () => ws.close();
  }, []);

  const sendMessage = (msg: string) => socket?.send(msg);

  const sendTyping = (status: boolean) =>
    socket?.send(JSON.stringify({ type: "typing", status }));

  return {
    socket,
    messages,
    sendMessage,
    sendTyping,
    userLabel,
    otherIsTyping,
  };
}
