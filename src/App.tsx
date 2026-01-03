import { useEffect, useState, useRef } from "react";
import "./App.css";
import { Spinner } from "./components/Spinner";
import { motion, AnimatePresence } from "framer-motion";
// 1. IMPORT CRYPTO-JS
import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

import {
  Send,
  ShieldCheck,
  Lock,
  Trash2,
  LogOut,
  KeyRound, // Added Key Icon
} from "lucide-react";

function App() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [messages, setMessages] = useState<
    { label: string; message: string }[]
  >([]);
  const [input, setInput] = useState("");
  // 2. ADD SECRET KEY STATE (Default to a common key or empty)

  // Rename your existing state logic (mental model)
  // secretKey = The "Real" key used for encryption (Debounced)
  // keyInputValue = The "Visual" key the user is typing (Immediate)

  const [secretKey, setSecretKey] = useState("default-secure-key");
  const [keyInputValue, setKeyInputValue] = useState("default-secure-key"); // New State
  const [showKeyInput, setShowKeyInput] = useState(false); // Toggle to show/hide key input

  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  let typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ---- Debounce Logic ----
  useEffect(() => {
    // Set a timer to update the real key after 500ms
    const handler = setTimeout(() => {
      setSecretKey(keyInputValue);
    }, 1000);

    // Clear the timer if the user types again (cancels the previous update)
    return () => {
      clearTimeout(handler);
    };
  }, [keyInputValue]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, otherIsTyping]);

  // WebSocket setup
  useEffect(() => {
    // const url = "ws://localhost:8080";
    const url = "https://chat-room-be-4.onrender.com";
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setSocket(ws);
      ws.send("You are connected ;)");
    };

    ws.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        // Handle plain text
        setMessages((prev) => [...prev, { label: "?", message: event.data }]);
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

      // 3. DECRYPT INCOMING MESSAGES
      if (parsed.type === "chat") {
        let decryptedMessage = parsed.message;

        try {
          // Attempt to decrypt. If it fails (wrong key), it might return empty or throw
          const bytes = AES.decrypt(parsed.message, secretKey);
          const originalText = bytes.toString(enc);

          // If decryption works, use it. If not (empty string), keep original (maybe it wasn't encrypted)
          if (originalText) {
            decryptedMessage = originalText;
          }
        } catch (e) {
          console.log("Decryption failed:", e);
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

    ws.onclose = () => setSocket(null);
    return () => ws.close();
  }, [secretKey]); // Re-run if secretKey changes (optional, but good for updating live decryption if we stored raw msgs)

  // 4. ENCRYPT OUTGOING MESSAGES
  const sendMessage = () => {
    if (input.trim() && socket) {
      // Encrypt the input before sending
      const encrypted = AES.encrypt(input, secretKey).toString();

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
  };

  if (rejection)
    return (
      <div className="bg-gray-900 text-slate-300 h-screen right-4 ">
        {rejection}
      </div>
    );
  if (!socket)
    return (
      <div className="text-white p-10 bg-gray-900 h-screen flex justify-center items-center">
        <Spinner />
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 p-4 font-sans text-gray-100">
      <div className="w-full max-w-lg bg-gray-900/90 backdrop-blur-sm border border-gray-800 rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden relative">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800 p-4 z-10 shadow-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-emerald-500 w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold text-white leading-tight">
                  Secure Chat
                </h1>
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-500 font-mono">
                    E2E ENCRYPTED
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {/* Key Toggle Button */}
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`p-2 rounded-lg transition-colors ${
                  showKeyInput
                    ? "bg-emerald-900/50 text-emerald-400"
                    : "text-gray-400 hover:bg-gray-800"
                }`}
                title="Set Encryption Key"
              >
                <KeyRound size={18} />
              </button>
              <button
                onClick={() => setMessages([])}
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"
              >
                <Trash2 size={18} />
              </button>
              <button
                onClick={() =>
                  socket?.send(JSON.stringify({ type: "disconnect_all" }))
                }
                className="p-2 hover:bg-red-900/30 rounded-lg text-gray-400 hover:text-red-400"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* Secret Key Input (Collapsible) */}
          <AnimatePresence>
            {showKeyInput && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gray-950 p-2 rounded-lg border border-gray-700 flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    Secret Key:
                  </span>
                  <input
                    type="text"
                    // Bind to the immediate value so typing feels fast
                    value={keyInputValue}
                    // Update the immediate value instantly
                    onChange={(e) => setKeyInputValue(e.target.value)}
                    className="bg-transparent border-none outline-none text-emerald-400 text-sm w-full font-mono placeholder-gray-700"
                    placeholder="Enter a shared secret..."
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1 ml-1">
                  * Must match the other user's key to read messages.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Area */}
        <div
          id="msgcontainer"
          className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-800"
        >
          {/* ... (Existing Chat Mapping Code) ... */}
          {messages.map((msg, index) => {
            const isMe = msg.label === userLabel;
            // Check if message looks encrypted (failsafe visual)
            const isEncryptedError = msg.message.includes(
              "Encrypted Message (Wrong Key)"
            );

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`flex max-w-[85%] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold mx-2 border ${
                      isMe
                        ? "bg-emerald-900/30 border-emerald-800 text-emerald-400"
                        : "bg-blue-900/30 border-blue-800 text-blue-400"
                    }`}
                  >
                    {msg.label}
                  </div>
                  {/* Bubble */}
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm break-words whitespace-pre-wrap ${
                      isMe
                        ? "bg-emerald-700 text-white rounded-tr-sm"
                        : isEncryptedError
                        ? "bg-red-900/50 text-red-200 border border-red-800 rounded-tl-sm" // Error Style
                        : "bg-gray-800 text-gray-200 rounded-tl-sm border border-gray-700"
                    }`}
                  >
                    {isEncryptedError && (
                      <Lock size={12} className="inline mr-1 mb-0.5" />
                    )}
                    {msg.message}
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area (Keep your existing one) */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="flex items-end gap-2 bg-gray-950 p-1.5 rounded-xl border border-gray-800 focus-within:border-emerald-600/50 transition-colors">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent text-white px-3 py-2.5 min-h-[44px] max-h-[150px] outline-none resize-none placeholder-gray-600 text-sm scrollbar-none"
              placeholder={`Message with key: ${secretKey.substring(0, 3)}...`} // UX Hint
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
              // Change this className:
              className={`p-2.5 rounded-lg transition-colors ${
                input.trim()
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
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
