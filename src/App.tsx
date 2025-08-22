import { useEffect, useState, useRef } from "react";
import "./App.css";

function App() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ws = new WebSocket("https://chat-room-be-4.onrender.com");
    ws.onopen = () => {
      setSocket(ws); // when connection is open, set socket state
    };

    ws.onmessage = (message) => {
      setMessages((prev) => [...prev, message.data]);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    ws.onclose = () => {
      setSocket(null);
    };

    return () => {
      ws.close(); // cleanup on unmount
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() && socket) {
      socket.send(input);
      setInput("");
      inputRef.current?.focus();
    }
  };

  const eraseMessages = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  if (!socket) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        We are connecting to chat server...
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-6">Plohea Chat Room</h1>
        <h2 className="font-bold text-white mb-6">
          In shadows deep, where trust is sworn, Your name’s erased, your mask
          is worn. Speak your heart, no fear of blame, The void protects your
          hidden flame.
        </h2>
      </div>
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col">
        <div className="flex-1 overflow-y-auto mb-4 text-white">
          <div className="text-gray-400 mb-2">Messages:</div>
          {messages.map((msg, index) => (
            <div
              key={index}
              className="mb-2 p-2 rounded-md bg-gray-700 max-w-max break-words"
            >
              {msg}
            </div>
          ))}
        </div>
        <div className="flex items-center border-t border-gray-700 pt-4">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-md outline-none focus:ring focus:ring-blue-500"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input}
            className={`ml-2 px-4 py-2 rounded-md text-white transition ${
              input.trim()
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-600 cursor-not-allowed"
            }`}
          >
            Send
          </button>
          <button
            onClick={eraseMessages}
            className="hidden sm:block ml-2 px-4 py-2 rounded-md text-white bg-red-900 hover:bg-red-700 cursor-pointer transition"
          >
            Erase
          </button>
        </div>
      </div>
      <div>
        <p className="text-gray-400 text-sm mt-4">
          Note: Speak in this void, where trust is true. No logs, no trails—your
          words slip through.
        </p>
      </div>
      <div>
        <p className="text-gray-400 text-sm mt-50">
          Made with ❤️ by Prince lohia
        </p>
      </div>
    </div>
  );
}

export default App;
