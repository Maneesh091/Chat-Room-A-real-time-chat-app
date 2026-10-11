import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  text: string;
  isOwn: boolean;
  timestamp: number;
}

interface WebSocketMessage {
  type: "init" | "chat" | "error" | "join" | "joined";
  payload: any;
}

function App() {
 

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [roomId, setRoomId] = useState("");
  const [isRoomJoined, setIsRoomJoined] = useState(false);


  const inputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userIdRef = useRef<string>("");
  const messageIdCounterRef = useRef<number>(0);


  const THEMES = [
  { id: "emerald", label: "Emerald", swatch: "#059669" },
  // { id: "violet", label: "Violet", swatch: "#7c3aed" },
  { id: "rose", label: "Rose", swatch: "#e11d48" },
  { id: "amber", label: "Amber", swatch: "#f59e0b" },
];

// component ke andar, baaki useState ke saath
const [theme, setTheme] = useState( "amber");

// useEffect(() => {
//   localStorage.setItem("chat-theme", theme);
// }, [theme]);

 
  // AUTO SCROLL
  

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  
  // WEBSOCKET CONNECTION
  

  useEffect(() => {
    const connectWebSocket = () => {
      try {
       const ws = new WebSocket(
  "wss://chat-room-a-real-time-chat-app.onrender.com"
);

        wsRef.current = ws;

        
        // CONNECTION OPEN
        

        ws.onopen = () => {
          console.log("WebSocket connected");

          setIsConnected(true);
          setIsLoading(false);
          setIsRoomJoined(false);
        };

        
        // SERVER MESSAGE
        

        ws.onmessage = (event) => {
          try {
            const data: WebSocketMessage =
              JSON.parse(event.data);

            
            if (data.type === "init") {
              userIdRef.current =
                data.payload.userId;

              console.log(
                "User ID:",
                userIdRef.current
              );
            }

            // Room joined successfully
            else if (data.type === "joined") {
              const joinedRoomId =
                data.payload.roomId;

              // console.log(
              //   "Joined room:",
              //   joinedRoomId
              // );

              setRoomId(joinedRoomId);
              setIsRoomJoined(true);
            }

            // Incoming chat message
            else if (data.type === "chat") {
              const {
                senderId,
                message,
                messageId,
              } = data.payload;

              const isOwnMessage =
                senderId === userIdRef.current;

              setMessages((prev) => {
                // Avoid duplicate messages
                const messageExists =
                  prev.some(
                    (msg) =>
                      msg.id === messageId
                  );

                if (messageExists) {
                  return prev;
                }

                const newMessage: Message = {
                  id:
                    messageId ||
                    `${Date.now()}-${Math.random()}`,
                  text: message,
                  isOwn: isOwnMessage,
                  timestamp: Date.now(),
                };

                return [...prev, newMessage];
              });
            }

            // Server error
            else if (data.type === "error") {
              console.error(
                "Server error:",
                data.payload?.message
              );

              setIsRoomJoined(false);
            }
          } catch (error) {
            console.error(
              "Message parsing error:",
              error
            );
          }
        };

         // CONNECTION ERROR
       

        ws.onerror = (error) => {
          console.error(
            "WebSocket error:",
            error
          );

          setIsConnected(false);
          setIsRoomJoined(false);
        };

        
        // CONNECTION CLOSED
        

        ws.onclose = () => {
          console.log(
            "WebSocket disconnected"
          );

          setIsConnected(false);
          setIsRoomJoined(false);
        };
      } catch (error) {
        console.error(
          "Connection error:",
          error
        );

        setIsLoading(false);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    // Cleanup when component unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  
  // JOIN ROOM
  

  const joinRoom = (id: string) => {
    const trimmedRoomId = id.trim();

    if (!trimmedRoomId) {
      console.log("Please enter a Room ID");
      return;
    }

    if (
      !wsRef.current ||
      wsRef.current.readyState !==
        WebSocket.OPEN
    ) {
      // console.log(
      //   "WebSocket is not connected"
      // );
      return;
    }

    const joinMessage: WebSocketMessage = {
      type: "join",

      payload: {
        roomId: trimmedRoomId,
      },
    };

    // console.log(
    //   "Requesting room:",
    //   trimmedRoomId
    // );

    wsRef.current.send(
      JSON.stringify(joinMessage)
    );
  };


  // JOIN EXISTING ROOM

  const handleJoinRoom = () => {
    joinRoom(roomId);
  };

  
  // CREATE ROOM

  
  // For now we generate a room ID
  // on the client and use the same
  // existing "join" protocol.
  
  // Your server will receive:
  
  // {
  //   type: "join",
  //   payload: {
  //     roomId: "room-xxxxxx"
  //   }
  // }
  

  const handleCreateRoom = () => {
    if (!isConnected) {
      console.log(
        "WebSocket is not connected"
      );
      return;
    }

    const newRoomId = `room-${Math.random()
      .toString(36)
      .substring(2, 8)}`;

    console.log(
      "Creating room:",
      newRoomId
    );

    joinRoom(newRoomId);
  };

  
  // SEND MESSAGE
  

  const handleSendMessage = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    const text = inputValue.trim();

    if (!text) {
      return;
    }

    if (!isConnected) {
      // console.log(
      //   "Not connected to WebSocket"
      // );
      return;
    }

    if (!isRoomJoined) {
      // console.log(
      //   "Join a room before sending messages"
      // );
      return;
    }

    try {
      const messageId =
        `${userIdRef.current}-${Date.now()}-${++messageIdCounterRef.current}`;

      // Optimistic update
      const optimisticMessage: Message = {
        id: messageId,
        text,
        isOwn: true,
        timestamp: Date.now(),
      };

      setMessages((prev) => [
        ...prev,
        optimisticMessage,
      ]);

      // Send to server
      const chatMessage = {
        type: "chat",

        payload: {
          message: text,
          roomId: roomId.trim(),
          messageId,
        },
      };

      wsRef.current?.send(
        JSON.stringify(chatMessage)
      );

      // Clear input
      setInputValue("");

      inputRef.current?.focus();
    } catch (error) {
      console.error(
        "Error sending message:",
        error
      );
    }
  };

  
  // ENTER TO SEND
  

  const handleKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey
    ) {
      e.preventDefault();

      handleSendMessage(
        e as unknown as React.FormEvent
      );
    }
  };

  
  // LEAVE ROOM
  

  const handleLeaveRoom = () => {
    setIsRoomJoined(false);
    setMessages([]);
    setRoomId("");

    // console.log("Left room UI");
  };



 return (
 <div
    data-theme={theme}
    className="min-h-screen bg-page text-main transition-colors duration-300"
  >

    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">

      {/* Hero section  */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 ">

        <div>
          <h1 className="text-2xl font-bold">
            Chat Room
          </h1>

          <p className="mt-1 text-sm text-soft">
            A real-time chat app
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 ">
         

          {/* Theme switcher */}
          <div
            role="group"
            aria-label="Choose theme"
            className="flex items-center gap-1 rounded-full border border-line bg-panel p-1"
          >
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                aria-pressed={theme === t.id}
                title={t.label}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  theme === t.id
                    ? "bg-brand text-brand-text"
                    : "text-soft hover:text-main"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-black/10"
                  style={{ backgroundColor: t.swatch }}
                />
                {t.label}
              </button>
            ))}
          </div>

          {/* Connection status */}
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm ${
              isConnected
                ? "bg-ok-bg text-ok-text"
                : "bg-bad-bg text-bad-text"
            }`}
          >

            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isConnected
                  ? "bg-ok-dot"
                  : "bg-bad-dot"
              }`}
            />

            <span>
              {isConnected
                ? "Connected"
                : "Disconnected"}
            </span>

          </div>

        </div>

      </header>


      {/* Room Section */}
      {!isRoomJoined && (

       <section className="mb-5 rounded-xl border border-line bg-panel p-5">

          <h2 className="text-base font-medium">
            Join a room
          </h2>

          <p className="mt-1 text-sm text-soft">
            Enter a Room ID or create a new room.
          </p>


          <div className="mt-4 flex flex-col gap-3 sm:flex-row">

            <input
              type="text"
              value={roomId}
              onChange={(e) =>
                setRoomId(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleJoinRoom();
                }
              }}
              placeholder="Enter Room ID"
              disabled={!isConnected}
              className="flex-1 rounded-lg border border-line bg-field px-4 py-2.5 text-sm text-main outline-none placeholder:text-faint focus:border-brand disabled:cursor-not-allowed disabled:opacity-50"
            />


            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={
                !isConnected ||
                !roomId.trim()
              }
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-brand-text transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join
            </button>


            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={!isConnected}
              className="rounded-lg border border-line bg-field px-5 py-2.5 text-sm font-medium text-main transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Room
            </button>

          </div>

        </section>

      )}


      {/* Current Room */}
      {isRoomJoined && (

        <div className="mb-4 flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3">

          <div>

            <p className="text-xs text-soft">
              Current Room
            </p>

            <p className="mt-1 text-sm font-medium text-main">
              {roomId}
            </p>

          </div>


          <button
            type="button"
            onClick={handleLeaveRoom}
            className="text-sm text-soft transition hover:text-bad-dot"
          >
            Leave
          </button>

        </div>

      )}


      {/* Chat Container */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-panel">


        {/* Chat Header */}
        <div className="border-b border-line px-4 py-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium">
                {isRoomJoined
                  ? `Room ${roomId}`
                  : "Chat"}
              </p>

              <p className="mt-0.5 text-xs text-soft">
                {isRoomJoined
                  ? "Messages are sent in real time"
                  : "Join a room to start chatting"}
              </p>

            </div>

            {isRoomJoined && (
              <span className="text-xs text-ok-dot">
                ● Active
              </span>
            )}

          </div>

        </div>


        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* Connecting */}
          {isLoading && (

            <div className="flex h-full items-center justify-center">

              <p className="text-sm text-soft">
                Connecting to server...
              </p>

            </div>

          )}


          {/* Not joined */}
          {!isLoading &&
            isConnected &&
            !isRoomJoined && (

              <div className="flex h-full items-center justify-center text-center">

                <div>

                  <p className="text-sm text-soft">
                    No room selected
                  </p>

                  <p className="mt-1 text-xs text-faint">
                    Create a room or enter a Room ID above.
                  </p>

                </div>

              </div>

            )}


          {/* Empty room */}
          {!isLoading &&
            isRoomJoined &&
            messages.length === 0 && (

              <div className="flex h-full items-center justify-center text-center">

                <div>

                  <p className="text-sm text-soft">
                    No messages yet
                  </p>

                  <p className="mt-1 text-xs text-faint">
                    Send a message to start the conversation.
                  </p>

                </div>

              </div>

            )}


          {/* Message List */}
          <div className="space-y-3">

            {messages.map((msg) => (

              <div
                key={msg.id}
                className={`flex ${
                  msg.isOwn
                    ? "justify-end"
                    : "justify-start"
                }`}
              >

                <div
                  className={`max-w-[75%] px-4 py-2.5 ${
                    msg.isOwn
                      ? "rounded-2xl rounded-br-md bg-bubble-out text-bubble-out-text"
                      : "rounded-2xl rounded-bl-md bg-bubble-in text-bubble-in-text"
                  }`}
                >

                  <p className="wrap-break-word text-sm">
                    {msg.text}
                  </p>

                  <p
                    className={`mt-1 text-[10px] ${
                      msg.isOwn
                        ? "text-time-out"
                        : "text-time-in"
                    }`}
                  >
                    {new Date(
                      msg.timestamp
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>

                </div>

              </div>

            ))}

            <div ref={messagesEndRef} />

          </div>

        </div>


        {/* Message Input */}
        <div className="border-t border-line p-3">

          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >

            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) =>
                setInputValue(e.target.value)
              }
              onKeyDown={handleKeyPress}
              disabled={
                !isConnected ||
                !isRoomJoined
              }
              placeholder={
                !isConnected
                  ? "Connecting..."
                  : !isRoomJoined
                  ? "Join a room first..."
                  : "Type a message..."
              }
              className="min-w-0 flex-1 rounded-full border border-line bg-field px-5 py-2.5 text-sm text-main outline-none placeholder:text-faint focus:border-brand disabled:cursor-not-allowed disabled:opacity-40"
            />


            {/* Send */}
            <button
              type="submit"
              disabled={
                !isConnected ||
                !isRoomJoined ||
                !inputValue.trim()
              }
              className="rounded-full bg-brand px-6 py-2.5 text-sm font-medium text-brand-text transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
            </button>

          </form>

        </div>

      </main>

    </div>

  </div>
);
}

export default App;