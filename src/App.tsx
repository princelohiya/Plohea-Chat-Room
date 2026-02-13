import { useEffect, useState, useRef } from "react";
import "./App.css";
import { Spinner } from "./components/Spinner";
import { motion, AnimatePresence } from "framer-motion";
import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

import {
  Send,
  ShieldCheck,
  Lock,
  Trash2,
  Users,
  LogOut,
  Hash,
  ArrowRight,
  AlertTriangle,
  KeyRoundIcon,
  ShieldUser,
} from "lucide-react";

function App() {
  // --- STATE ---
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomInput, setRoomInput] = useState("");
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [messages, setMessages] = useState<
    { label: string; message: string; isEncrypted?: boolean }[]
  >([]);
  const [input, setInput] = useState("");
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showKeyInput, setShowKeyInput] = useState(false);

  // --- REFS ---
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherIsTyping]);

  // ---- WebSocket Connection ----
  useEffect(() => {
    if (!roomId) return;
    const url = `ws://localhost:8080?room=${roomId}`;
    // const url = `https://chat-room-be-4.onrender.com?room=${roomId}`;

    const ws = new WebSocket(url);

    ws.onopen = () => {
      setSocket(ws);
      ws.send("You are connected ;)");
    };

    ws.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch (e) {
        setMessages((prev) => [...prev, { label: "?", message: event.data }]);
        return;
      }

      if (parsed.type === "user_count") {
        setOnlineCount(parsed.count);
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
        let finalMessage = parsed.message;
        let isEncryptedError = false;

        // 🧠 SMART DECRYPTION LOGIC
        // 1. Check if it LOOKS like AES (starts with U2F)
        if (parsed.message.startsWith("U2F")) {
          try {
            const currentKey = roomIdRef.current || "default";
            const bytes = AES.decrypt(parsed.message, currentKey);
            const decrypted = bytes.toString(enc);

            if (decrypted) {
              finalMessage = decrypted;
            } else {
              // Decryption produced empty string -> Wrong Key
              isEncryptedError = true;
              console.warn("Decryption failed (Wrong Key)");
            }
          } catch (e) {
            isEncryptedError = true;
          }
        } else {
          // 2. It's plain text
          // Just show it as is!
          finalMessage = parsed.message;
        }

        setMessages((prev) => [
          ...prev,
          {
            label: parsed.label,
            message: finalMessage,
            isEncrypted: isEncryptedError,
          },
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
  }, [roomId]);

  // ---- HANDLERS ----
  const joinRoom = () => {
    if (roomInput.trim()) setRoomId(roomInput.trim());
  };

  const leaveRoom = () => {
    setRoomId(null);
    setRoomInput("");
    setMessages([]);
    setRejection(null);
    socket?.close();
  };

  const handleGuestJoin = () => {
    setRoomInput("default");
    setRoomId("default");
  };

  const sendMessage = () => {
    if (input.trim() && socket) {
      const currentKey = roomIdRef.current || "default";
      // Encrypt
      const encrypted = AES.encrypt(input, currentKey).toString();

      socket.send(encrypted);
      setOtherIsTyping(false);
      setInput("");
      inputRef.current?.focus();
      if (inputRef.current) inputRef.current.style.height = "44px";
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (!isTyping && socket) {
      setIsTyping(true);
      socket.send(JSON.stringify({ type: "typing", status: true }));
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      socket?.send(JSON.stringify({ type: "typing", status: false }));
    }, 1200);

    e.target.style.height = "44px";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // --- Lobby  ---
  if (!roomId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-6 text-white font-sans">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
          <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-emerald-500 to-blue-900 bg-clip-text text-transparent">
            Cipher Chat
          </h1>
          <p className="text-gray-500 text-center mb-8">
            Create or join a private room.
          </p>
          <div className="space-y-4">
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 flex items-center gap-3 focus-within:border-emerald-800 transition-colors">
              <Hash className="text-gray-500" />
              <input
                type="text"
                placeholder="Enter Room Name"
                className="bg-transparent outline-none flex-1 text-white placeholder-gray-600"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
            </div>
            <button
              onClick={handleGuestJoin}
              className="w-full bg-emerald-800 hover:bg-emerald-700 cursor-pointer disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Guest user <ShieldUser size={20} />
            </button>
            <button
              onClick={joinRoom}
              disabled={!roomInput.trim()}
              className="w-full bg-emerald-800 hover:bg-emerald-700 cursor-pointer disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Enter Room <ArrowRight size={20} />
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center mt-6">
          <span className="text-emerald-500 font-bold">Note:</span> The Room
          Name acts as your Secret Key.
          <br />
          Only people with this exact name can read messages.
        </p>
      </div>
    );
  }

  if (rejection) {
    return (
      <div className="bg-gray-900 text-white h-screen flex flex-col justify-center items-center gap-4">
        <span className="text-xl text-red-400">{rejection}</span>
        <button
          onClick={leaveRoom}
          className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  if (!socket)
    return (
      <div className="text-white p-10 bg-gray-900 h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );

  // --- Main App ---

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-4 font-sans text-gray-100">
      <div className="w-full max-w-lg bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden relative">
        <div className="bg-gray-900 border-b border-gray-800 px-[12px] pt-[10px] z-10 shadow-md">
          <div className="flex items-center justify-between mb-3 bg-gray-900 p-2 rounded-xl">
            <div className="flex items-center gap-3 overflow-hidden">
              <ShieldCheck
                onClick={leaveRoom}
                className="text-emerald-500 w-8 h-8 flex-shrink-0 cursor-pointer"
              />
              <div className="flex flex-col min-w-0">
                <h1 className="text-lg font-bold text-white leading-tight truncate">
                  Cipher Chat
                </h1>
                <div className="flex items-center gap-2 text-xs font-mono mt-0.5">
                  <div className="flex items-center gap-1 text-emerald-500 ">
                    <Lock className="w-3 h-3 animate-pulse" />{" "}
                    <span className="hidden sm:inline ">ENCRYPTED</span>
                  </div>
                  <span className="text-gray-600">•</span>
                  <div className="flex items-center gap-1 bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-700">
                    <Users className="w-3 h-3 text-blue-400" />{" "}
                    <span className="text-blue-300">{onlineCount} Online</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-2 ">
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  showKeyInput
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "text-gray-400 hover:bg-gray-800"
                }`}
              >
                <KeyRoundIcon size={18} />
              </button>
              <button
                onClick={() => setMessages([])}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 cursor-pointer"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={leaveRoom}
                className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400 cursor-pointer"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {showKeyInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden "
              >
                <div className="bg-gray-950 p-2 rounded-lg border border-gray-700 flex items-center gap-2 mt-2 mb-3 hover:border-emerald-600 transition-colors ">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Secret Key :
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={roomInput}
                    className="bg-transparent border-none outline-none text-emerald-400 text-sm w-full font-mono placeholder-gray-700"
                    placeholder="Enter a shared secret..."
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div
          id="msgcontainer"
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800"
        >
          {messages.map((msg, index) => {
            const isMe = msg.label === userLabel;
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mx-2 border ${
                      isMe
                        ? "bg-emerald-900/30 border-emerald-800 text-emerald-400"
                        : "bg-blue-900/30 border-blue-800 text-blue-400"
                    }`}
                  >
                    {msg.label.includes("User")
                      ? msg.label.split("-")[1].slice(0, 2)
                      : msg.label}
                  </div>
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                      isMe
                        ? "bg-emerald-700 text-white rounded-tr-sm"
                        : msg.isEncrypted
                          ? "bg-red-900/30 text-red-200 border border-red-800/50 rounded-tl-sm italic"
                          : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"
                    }`}
                  >
                    {msg.isEncrypted && (
                      <AlertTriangle
                        size={12}
                        className="inline mr-1 mb-0.5 text-red-400"
                      />
                    )}
                    {msg.message}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <AnimatePresence>
            {otherIsTyping && (
              <motion.div
                className="flex items-center gap-2 ml-10 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="bg-gray-800 border border-gray-700 px-3 py-2 rounded-xl rounded-tl-sm flex gap-1 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-xs text-gray-500 animate-pulse font-mono">
                  typing...
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="flex items-end gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800 focus-within:border-emerald-600/50 transition-colors">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent text-white px-3 py-2.5 min-h-[44px] max-h-[150px] outline-none resize-none placeholder-gray-600 text-sm scrollbar-none"
              placeholder={`Message in ${roomId.slice(0, 3)}...`}
              value={input}
              rows={1}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              onInput={(e) => {
                e.currentTarget.style.height = "44px";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className={`p-3 mb-0.5 rounded-lg transition-colors ${
                input.trim()
                  ? "bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
