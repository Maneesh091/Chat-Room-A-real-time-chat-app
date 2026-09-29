# Real-time-Chat-App

A real-time, room-based chat application built with WebSockets. Users can create or join a room using a Room ID, and every message is instantly broadcast to everyone in that room.

 Features:-
 Real-time messaging using WebSockets (no page refresh or polling)
 Create a new room (auto-generated Room ID) or join an existing one
 Multiple users per room, with messages broadcast only inside that room
Live connection status indicator (Connected / Disconnected)
 Optimistic UI: your message appears instantly, and duplicates are prevented using unique message IDs
 Auto-scroll to the latest message
 Clean dark UI styled
 Basic validation (empty Room ID, sending without joining a room, etc.) 

 Tech Stack:-
Layer	     Technology
Frontend	React, TypeScript, Tailwind CSS
Backend  	Node.js, TypeScript, ws (WebSocket server)
Config	   dotenv for environment variables 

chat-app/
├── backend/
│   ├── src/
│   │   └── index.ts        # WebSocket server
│   ├── .env                # PORT config
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   └── App.tsx         # Chat UI + WebSocket client
│   └── package.json
│
└── README.md

