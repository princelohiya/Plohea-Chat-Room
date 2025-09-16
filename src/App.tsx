import { useEffect, useState, useRef } from "react";
import "./App.css";
import { Spinner } from "./components/Spinner";

function App() {
  const [socket, setSocket] = useState<null | WebSocket>(null);
  const [messages, setMessages] = useState<
    { label: string; message: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);

  let typingTimeout = useRef<NodeJS.Timeout | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // ws://localhost:8080 for local testing
    // https://chat-room-be-4.onrender.com for deployed server
    const ws = new WebSocket("https://chat-room-be-4.onrender.com"); // replace with your server URL

    ws.onopen = () => {
      setSocket(ws); // when connection is open, set socket state
      ws.send("You are connected ;)");
    };

    ws.onmessage = (event) => {
      let parsed;
      try {
        parsed = JSON.parse(event.data);
        console.log("Received :", parsed);
      } catch {
        // fallback for plain text
        setMessages((prev) => [...prev, { label: "?", message: event.data }]);
        return;
      }

      if (
        parsed.type === "server" &&
        parsed.message === "Session ended by user."
      ) {
        setRejection(
          "This session has ended for both clients. Refresh to start a new one."
        );
        ws.close();
        return;
      }

      if (parsed.type === "assign") {
        setUserLabel(parsed.label); // "A" or "B"
      } else if (parsed.type === "chat") {
        setMessages((prev) => [
          ...prev,
          { label: parsed.label, message: parsed.message },
        ]);
      } else if (parsed.type === "typing") {
        setOtherIsTyping(parsed.status);

        if (userLabel && parsed.label !== userLabel) {
          if (typingTimeout.current) clearTimeout(typingTimeout.current);

          typingTimeout.current = setTimeout(() => {
            setOtherIsTyping(false);
          }, 1000);
        }
      }

      if (parsed.type === "server" && parsed.message === "Room is full.") {
        setRejection("Room is full. Please try again later.");
        ws.close();
        return;
      }
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
      setOtherIsTyping(false);
      setInput("");
      inputRef.current?.focus();
      if (inputRef.current) {
        inputRef.current.style.height = "40px"; // reset to default height
      }
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    if (!isTyping && socket) {
      setIsTyping(true);
      socket.send(JSON.stringify({ type: "typing", status: true }));
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);

    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      if (socket) {
        socket.send(JSON.stringify({ type: "typing", status: false }));
      }
    }, 1200);
  };

  if (rejection) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white text-xl">
        {rejection}
      </div>
    );
  }

  if (!socket) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="text-lg font-semibold mb-4">
          We are connecting to chat server...
        </div>
        <div className="mt-4">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-6 ">CY EBHZ</h1>
        <h2 className="font-bold text-white mb-6 max-w-md">
          In shadows deep, where trust is sworn, Your name’s erased, your mask
          is worn. Speak your heart, no fear of blame, The void protects your
          hidden flame.
        </h2>
      </div>
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6 flex flex-col hover:shadow-2xl transition-shadow duration-300 mb-4 ">
        <div className="flex-1 overflow-y-auto mb-4 text-white">
          <div className="text-gray-400 mb-2">Messages:</div>
          {messages.map((msg, index) => (
            <div className="flex items-start mb-2" key={index}>
              <div
                className={`flex justify-center items-center rounded-full h-10 w-10 mr-3 flex-shrink-0 ${
                  msg.label === userLabel
                    ? "bg-green-700 text-white"
                    : "bg-blue-700 text-white"
                }`}
              >
                <span className="text-xl ">{msg.label}</span>
              </div>
              <div className="mb-2 p-2 rounded-md bg-gray-700 max-w-md break-words whitespace-pre-wrap">
                {msg.message}
              </div>
            </div>
          ))}
        </div>
        {otherIsTyping && (
          <div className="italic text-gray-400 mb-2">
            The other user is typing…
          </div>
        )}
        <div className="flex items-center border-t border-gray-700 pt-4">
          <textarea
            ref={inputRef}
            className="flex-1 min-h-[40px] max-h-[200px] bg-gray-900 text-white px-4 py-2 rounded-md outline-none focus:ring focus:ring-blue-500 resize-none overflow-hidden"
            placeholder="Type a message..."
            value={input}
            rows={1}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            onInput={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
              const textarea = e.target;
              // textarea.style.height = "auto"; // reset
              textarea.style.height = `${textarea.scrollHeight}px`; // grow
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input}
            className={`ml-2 px-4 py-2 rounded-md text-white transition ${
              input.trim()
                ? "bg-slate-600 hover:bg-sl3ate-700"
                : "bg-gray-600 cursor-not-allowed"
            } hover:drop-shadow-lg`}
          >
            Send
          </button>
        </div>
      </div>
      <div className="text-center mb-6">
        <button
          onClick={() => {
            if (socket) {
              socket.send(JSON.stringify({ type: "disconnect_all" }));
            }
          }}
          className={`ml-2 px-4 py-2 rounded-md text-white transition bg-red-400 hover:bg-red-700 hover:drop-shadow-lg`}
        >
          Disconnect All
        </button>
        <button
          onClick={() => {
            //clear chat by closing the socket (server clears chat on disconnect)
            setMessages([]);
          }}
          className={`ml-2 px-4 py-2 rounded-md text-white transition bg-blue-600 hover:bg-blue-700 hover:drop-shadow-lg`}
        >
          Clear Chat
        </button>
        <p className="text-gray-400 text-sm mt-6 max-w-xs">
          Note: No eyes to see, no names to know, Trust this place where secrets
          flow.
        </p>
      </div>
      <div>
        <p className="text-gray-400 text-sm mt-30">Made with ❤️ by Anonymous</p>
      </div>
    </div>
  );
}

export default App;
