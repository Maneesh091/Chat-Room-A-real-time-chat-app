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
 <div className="min-h-screen bg-slate-950 text-white">

    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 py-6">

      {/* Hero section  */}
      <header className="mb-6 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-bold ">
            Chat Room
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            A real-time chat app
          </p>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-2 text-sm">

          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />

          <span className="text-gray-400">
            {isConnected
              ? "Connected"
              : "Disconnected"}
          </span>

        </div>

      </header>


      {/* Room Section */}
      {!isRoomJoined && (

       <section className="mb-5 rounded-xl border border-[#263449] bg-[#172033] p-5">

          <h2 className="text-base font-medium">
            Join a room
          </h2>

          <p className="mt-1 text-sm text-gray-500">
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
              className="flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
            />


            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={
                !isConnected ||
                !roomId.trim()
              }
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join
            </button>


            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={!isConnected}
              className="rounded-lg border border-gray-700 bg-gray-800 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Room
            </button>

          </div>

        </section>

      )}


      {/* Current Room */}
      {isRoomJoined && (

        <div className="mb-4 flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">

          <div>

            <p className="text-xs text-gray-500">
              Current Room
            </p>

            <p className="mt-1 text-sm font-medium text-white">
              {roomId}
            </p>

          </div>


          <button
            type="button"
            onClick={handleLeaveRoom}
            className="text-sm text-gray-500 transition hover:text-red-400"
          >
            Leave
          </button>

        </div>

      )}


      {/* Chat Container */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">


        {/* Chat Header */}
        <div className="border-b border-gray-800 px-4 py-3">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium">
                {isRoomJoined
                  ? `Room ${roomId}`
                  : "Chat"}
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                {isRoomJoined
                  ? "Messages are sent in real time"
                  : "Join a room to start chatting"}
              </p>

            </div>

            {isRoomJoined && (
              <span className="text-xs text-green-500">
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

              <p className="text-sm text-gray-500">
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

                  <p className="text-sm text-gray-400">
                    No room selected
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
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

                  <p className="text-sm text-gray-400">
                    No messages yet
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
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
                  className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                    msg.isOwn
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-200"
                  }`}
                >

                  <p className="wrap-break-word text-sm">
                    {msg.text}
                  </p>

                  <p
                    className={`mt-1 text-[10px] ${
                      msg.isOwn
                        ? "text-blue-200"
                        : "text-gray-500"
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
        <div className="border-t border-gray-800 p-3">

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
              className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-gray-500 disabled:cursor-not-allowed disabled:opacity-40"
            />


            {/* Send */}
            <button
              type="submit"
              disabled={
                !isConnected ||
                !isRoomJoined ||
                !inputValue.trim()
              }
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
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