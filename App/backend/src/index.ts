import { WebSocketServer, WebSocket } from "ws";
import dotenv from "dotenv"
dotenv.config();
import { randomUUID } from "crypto";
const PORT = Number(process.env.PORT) || 8080;
const wss = new WebSocketServer({ port: PORT });

let allSockets = new Map<string, WebSocket[]>();
let userToRoomId = new Map<WebSocket, string>();
let socketToUserId = new Map<WebSocket, string>();

wss.on("connection", (socket) => {


    socket.on("message", (message) => {
        try {
            const parsedMessage = JSON.parse(message.toString());

            // console.log(` Received:`, parsedMessage.type);

            // JOIN ROOM

            if (parsedMessage.type === "join") {
                const roomId = parsedMessage.payload?.roomId;

                if (!roomId || !roomId.trim()) {
                    socket.send(
                        JSON.stringify({
                            type: "error",
                            payload: {
                                message: "Room ID is required",
                            },
                        })
                    );

                    return;
                }

                const cleanRoomId = roomId.trim();


                // Check if user is already inside another room

                const previousRoomId = userToRoomId.get(socket);

                if (
                    previousRoomId &&
                    previousRoomId !== cleanRoomId
                ) {
                    const previousRoom =
                        allSockets.get(previousRoomId);

                    if (previousRoom) {
                        const index =
                            previousRoom.indexOf(socket);

                        if (index !== -1) {
                            previousRoom.splice(index, 1);
                        }



                        // Delete previous room if empty
                        if (previousRoom.length === 0) {
                            allSockets.delete(previousRoomId);

                            // console.log(
                            //     ` Room ${previousRoomId} deleted because it is empty`
                            // );
                        }
                    }
                }


                // Create room if it doesn't exist
                 if (!allSockets.has(cleanRoomId)) {
                    allSockets.set(cleanRoomId, []);
                }

                const room = allSockets.get(cleanRoomId)!;


                // Prevent duplicate socket in same room
                 if (!room.includes(socket)) {
                    room.push(socket);
                }

                // Remember user's current room
                userToRoomId.set(socket, cleanRoomId);



                // Tell frontend that room join was successful
                       socket.send(
                    JSON.stringify({
                        type: "joined",
                        payload: {
                            roomId: cleanRoomId,
                        },
                    })
                );
            }


            // CHAT MESSAGES

            else if (parsedMessage.type === "chat") {
                
                // Get room from server-side mapping.
                const roomId = userToRoomId.get(socket);


                // User has not joined any room
                if (!roomId) {
                    socket.send(
                        JSON.stringify({
                            type: "error",
                            payload: {
                                message:
                                    "You are not part of any room",
                            },
                        })
                    );

                    return;
                }


                // Get all sockets inside current room

                const allPeopleInRoom =
                    allSockets.get(roomId);

                if (
                    !allPeopleInRoom ||
                    allPeopleInRoom.length === 0
                ) {
                    console.log(
                        ` No clients in room ${roomId}`
                    );

                    return;
                }

                const senderId =
                    socketToUserId.get(socket);

                const messageId =
                    parsedMessage.payload?.messageId;

                const messageText =
                    parsedMessage.payload?.message;

                const imageData =
                    parsedMessage.payload?.imageData;

                const imageType =
                    parsedMessage.payload?.imageType;





                // CREATE MESSAGE PAYLOAD

              const payload = {
                    message: messageText,
                    senderId: senderId,
                    messageId: messageId,
                };

                // BROADCAST MESSAGE TO ROOM

                allPeopleInRoom.forEach(
                    (s, index) => {

                        if (
                            s.readyState ===
                            WebSocket.OPEN
                        ) {
                            s.send(
                                JSON.stringify({
                                    type: "chat",
                                    payload: payload,
                                })
                            );

                           

                        }
                    }
                );


            }
        } catch (error) {

        }
    });


    // SOCKET DISCONNECT
    
    socket.on("close", () => {
        const roomId =
            userToRoomId.get(socket);

        const userId =
            socketToUserId.get(socket);

        if (roomId) {
            const room =
                allSockets.get(roomId);

            if (room) {
                const index =
                    room.indexOf(socket);

                if (index > -1) {
                    room.splice(index, 1);

                    console.log(
                        ` User ${userId} left room ${roomId} (${room.length} remaining)`
                    );
                }

                // Delete empty room

                if (room.length === 0) {
                    allSockets.delete(roomId);

                    console.log(
                        ` Room ${roomId} deleted because it is empty`
                    );
                }
            }
        }

        // Remove socket mappings
       userToRoomId.delete(socket);
        socketToUserId.delete(socket);

        console.log(
            ` User ${userId} disconnected`
        );
    });


    // SOCKET ERROR
   
    socket.on("error", (error) => {
        console.error(
            " WebSocket error:",
            error
        );
    });
});

console.log(
    ` WebSocket server running on ws: ${PORT}`
);