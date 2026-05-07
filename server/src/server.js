const express = require("express"); //handle HTTP requests and creating APIs.
const dotenv = require("dotenv"); //Loads environment variables from a .env file, so we can store secrets like API keys or database URLs securely.
const http = require("http"); //creates an http server
const cors = require("cors"); //Middleware that allows cross-origin requests, enabling frontend and backend to communicate from different domains.
const { SocketEvent } = require("./types/socket");
const { USER_CONNECTION_STATUS } = require("./types/user");
const { Server } = require("socket.io");
const path = require("path");

//Reads the .env file and loads the environment variables into process.env.
dotenv.config();

//Create an Express app
const app = express();

//This middleware allows the server to parse JSON data in incoming requests.
app.use(express.json());

app.use(cors()); //Enable CORS for all requests
app.use(express.static(path.join(__dirname, "..", "public"))); // Serve static files

const server = http.createServer(app); //Create an HTTP server using the Express app

//initialize socket.io on top of the http server
const io = new Server(server, {
	cors: { origin: "*" }, //Allow all origins
	maxHttpBufferSize: 1e8, //100MB of data
	pingTimeout: 60000, //60 seconds of inactivity
});

//Store all users and their details
let userSocketMap = [];
//Store room owners
let roomOwners = {};
//Store pending join requests per room
let pendingJoins = {};

// Function to get all users in a room or active users
function getUsersInRoom(roomId) {
	return userSocketMap.filter((user) => user.roomId === roomId);
}

function getValidOwnerSocketId(roomId) {
	const existingUsers = getUsersInRoom(roomId);
	const currentOwnerSocketId = roomOwners[roomId];
	const isCurrentOwnerOnline = existingUsers.some(
		(user) => user.socketId === currentOwnerSocketId,
	);

	if (isCurrentOwnerOnline) {
		return currentOwnerSocketId;
	}

	const nextOwnerSocketId = existingUsers[0] ? existingUsers[0].socketId : null;
	if (nextOwnerSocketId) {
		const prevOwnerSocketId = roomOwners[roomId];
		roomOwners[roomId] = nextOwnerSocketId;
		if (prevOwnerSocketId && prevOwnerSocketId !== nextOwnerSocketId) {
			io.to(roomId).emit(SocketEvent.OWNER_CHANGED, {
				roomId,
				ownerSocketId: nextOwnerSocketId,
			});
		}
		return nextOwnerSocketId;
	}

	delete roomOwners[roomId];
	return null;
}

// Function to get room id by socket id
function getRoomId(socketId) {
	const user = userSocketMap.find((user) => user.socketId === socketId);
	if (!user) return null;
	return user.roomId;
}

// Function to get user by socket id
function getUserBySocketId(socketId) {
	const user = userSocketMap.find((user) => user.socketId === socketId);
	if (!user) return null;
	return user;
}

//Socket.io event handlers
io.on("connection", (socket) => {
	socket.on(SocketEvent.JOIN_REQUEST, ({ roomId, username }) => {
		const existingUsers = getUsersInRoom(roomId);

		// Check if username already exists among active users in the room
		const existingUserWithSameName = existingUsers.find(
			(u) => u.username === username,
		);

		// Allow fast refresh/rejoin: if the old socket is gone, replace it.
		// (Security trade-off is acceptable for this project.)
		if (existingUserWithSameName) {
			const oldSocketId = existingUserWithSameName.socketId;
			const oldSocket = io.sockets.sockets.get(oldSocketId);
			if (oldSocket) {
				// Forcefully disconnect the old socket to free the username
				oldSocket.disconnect(true);
			}
			userSocketMap = userSocketMap.filter((u) => u.socketId !== oldSocketId);
		}

		// If this is the first user in the room, auto-accept and set as owner
		if (existingUsers.length === 0) {
			const user = {
				username,
				roomId,
				status: USER_CONNECTION_STATUS.ONLINE,
				cursorPosition: 0,
				typing: false,
				socketId: socket.id,
				currentFile: null,
			};

			userSocketMap.push(user);
			socket.join(roomId);
			roomOwners[roomId] = socket.id;
			socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user });

			const users = getUsersInRoom(roomId);
			io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, {
				user,
				users,
				ownerSocketId: roomOwners[roomId],
			});
			return;
		}

		// For subsequent users, create a pending join request to be approved by the room owner
		if (!pendingJoins[roomId]) {
			pendingJoins[roomId] = [];
		}

		// Prevent duplicate pending requests with the same username in this room
		// If there is a previous pending request for this username, replace it (refresh/retry)
		pendingJoins[roomId] = pendingJoins[roomId].filter(
			(pending) => pending.username !== username,
		);

		const pendingUser = {
			username,
			roomId,
			socketId: socket.id,
		};

		pendingJoins[roomId].push(pendingUser);

		const ownerSocketId = getValidOwnerSocketId(roomId);
		if (ownerSocketId) {
			io.to(ownerSocketId).emit(SocketEvent.JOIN_PENDING, {
				socketId: pendingUser.socketId,
				username: pendingUser.username,
				roomId: pendingUser.roomId,
			});
		}

		io.to(pendingUser.socketId).emit(SocketEvent.JOIN_WAITING, {
			roomId: pendingUser.roomId,
		});
	});

	socket.on(SocketEvent.JOIN_APPROVE, ({ socketId }) => {
		// Find the pending user and associated room
		let targetRoomId = null;
		let pendingUserIndex = -1;

		for (const roomId of Object.keys(pendingJoins)) {
			const index = pendingJoins[roomId].findIndex((pending) => pending.socketId === socketId);
			if (index !== -1) {
				targetRoomId = roomId;
				pendingUserIndex = index;
				break;
			}
		}

		if (!targetRoomId || pendingUserIndex === -1) {
			return;
		}

		// Only the room owner can approve
		const ownerSocketId = getValidOwnerSocketId(targetRoomId);
		if (ownerSocketId !== socket.id) {
			return;
		}

		const [pendingUser] = pendingJoins[targetRoomId].splice(pendingUserIndex, 1);
		if (pendingJoins[targetRoomId].length === 0) {
			delete pendingJoins[targetRoomId];
		}
		if (!pendingUser) {
			return;
		}

		const targetSocket = io.sockets.sockets.get(pendingUser.socketId);
		if (!targetSocket) {
			return;
		}

		const user = {
			username: pendingUser.username,
			roomId: targetRoomId,
			status: USER_CONNECTION_STATUS.ONLINE,
			cursorPosition: 0,
			typing: false,
			socketId: pendingUser.socketId,
			currentFile: null,
		};

		userSocketMap.push(user);
		targetSocket.join(targetRoomId);
		targetSocket.broadcast.to(targetRoomId).emit(SocketEvent.USER_JOINED, { user });

		const users = getUsersInRoom(targetRoomId);
		io.to(pendingUser.socketId).emit(SocketEvent.JOIN_ACCEPTED, {
			user,
			users,
			ownerSocketId: getValidOwnerSocketId(targetRoomId),
		});
	});

	socket.on(SocketEvent.JOIN_REJECT, ({ socketId }) => {
		// Find the pending user and associated room
		let targetRoomId = null;
		let pendingUserIndex = -1;

		for (const roomId of Object.keys(pendingJoins)) {
			const index = pendingJoins[roomId].findIndex((pending) => pending.socketId === socketId);
			if (index !== -1) {
				targetRoomId = roomId;
				pendingUserIndex = index;
				break;
			}
		}

		if (!targetRoomId || pendingUserIndex === -1) {
			return;
		}

		// Only the room owner can reject
		const ownerSocketId = getValidOwnerSocketId(targetRoomId);
		if (ownerSocketId !== socket.id) {
			return;
		}

		const [pendingUser] = pendingJoins[targetRoomId].splice(pendingUserIndex, 1);
		if (pendingJoins[targetRoomId].length === 0) {
			delete pendingJoins[targetRoomId];
		}
		if (!pendingUser) {
			return;
		}

		io.to(pendingUser.socketId).emit(SocketEvent.JOIN_REJECTED, {
			reason: "Room owner rejected the join request.",
		});
	});

	//When a user is about to disconnect
	socket.on("disconnecting", () => {
		const user = getUserBySocketId(socket.id);
		if (user) {
			socket.broadcast.to(user.roomId).emit(SocketEvent.USER_DISCONNECTED, { user });
			userSocketMap = userSocketMap.filter((u) => u.socketId !== socket.id);
			socket.leave(user.roomId);
			getValidOwnerSocketId(user.roomId);
		}

		// Clean up any pending join requests for this socket
		for (const roomId of Object.keys(pendingJoins)) {
			const remaining = pendingJoins[roomId].filter((pending) => pending.socketId !== socket.id);
			if (remaining.length === 0) {
				delete pendingJoins[roomId];
			} else {
				pendingJoins[roomId] = remaining;
			}
		}
	});

	// Request a deterministic sync from the room owner (files + drawing)
	socket.on(SocketEvent.REQUEST_SYNC, () => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;
		const ownerSocketId = getValidOwnerSocketId(roomId);
		if (!ownerSocketId) return;
		if (ownerSocketId === socket.id) return;
		io.to(ownerSocketId).emit(SocketEvent.REQUEST_SYNC, { socketId: socket.id });
	});

	//handling file actions
	socket.on(SocketEvent.SYNC_FILE_STRUCTURE, (data) => {
		io.to(data.socketId).emit(SocketEvent.SYNC_FILE_STRUCTURE, data);
	});

	[
		"DIRECTORY_CREATED",
		"DIRECTORY_UPDATED",
		"DIRECTORY_RENAMED",
		"DIRECTORY_DELETED",
		"FILE_CREATED",
		"FILE_UPDATED",
		"FILE_RENAMED",
		"FILE_DELETED",
	].forEach((event) => {
		socket.on(SocketEvent[event], (data) => {
			const roomId = getRoomId(socket.id);
			if (!roomId) return;
			socket.broadcast.to(roomId).emit(SocketEvent[event], data);
		});
	});

	//handling user status
	["USER_OFFLINE", "USER_ONLINE"].forEach((event) => {
		socket.on(SocketEvent[event], ({ socketId }) => {
			userSocketMap = userSocketMap.map((user) =>
				user.socketId === socketId ? { ...user, status: USER_CONNECTION_STATUS[event] } : user,
			);
			const roomId = getRoomId(socketId);
			if (!roomId) return;
			socket.broadcast.to(roomId).emit(SocketEvent[event], { socketId });
		});
	});

	//handling chat messaging
	socket.on(SocketEvent.SEND_MESSAGE, ({ message }) => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;
		socket.broadcast.to(roomId).emit(SocketEvent.RECEIVE_MESSAGE, { message });
	});

	socket.on(SocketEvent.TYPING_START, ({ cursorPosition }) => {
		userSocketMap = userSocketMap.map((user) => (user.socketId === socket.id ? { ...user, typing: true, cursorPosition } : user));
		const user = getUserBySocketId(socket.id);
		if (!user) return;
		socket.broadcast.to(user.roomId).emit(SocketEvent.TYPING_START, { user });
	});

	socket.on(SocketEvent.TYPING_PAUSE, () => {
		userSocketMap = userSocketMap.map((user) => (user.socketId === socket.id ? { ...user, typing: false } : user));
		const user = getUserBySocketId(socket.id);
		if (!user) return;
		socket.broadcast.to(user.roomId).emit(SocketEvent.TYPING_PAUSE, { user });
	});

	socket.on(SocketEvent.REQUEST_DRAWING, () => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;
		socket.broadcast.to(roomId).emit(SocketEvent.REQUEST_DRAWING, { socketId: socket.id });
	});

	socket.on(SocketEvent.SYNC_DRAWING, ({ drawingData, socketId }) => {
		socket.broadcast.to(socketId).emit(SocketEvent.SYNC_DRAWING, { drawingData });
	});

	//sends the drawing data to all users in the room
	socket.on(SocketEvent.DRAWING_UPDATE, ({ snapshot }) => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;
		socket.broadcast.to(roomId).emit(SocketEvent.DRAWING_UPDATE, { snapshot });
	});
	// Voice channel events (signaling + presence)
	socket.on(SocketEvent.VOICE_JOIN, ({ username }) => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;

		socket.join(roomId);
		socket.broadcast.to(roomId).emit(SocketEvent.VOICE_JOIN, {
			username,
			socketId: socket.id,
		});
	});

	socket.on(SocketEvent.VOICE_LEAVE, ({ username }) => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;

		socket.leave(roomId);
		socket.broadcast.to(roomId).emit(SocketEvent.VOICE_LEAVE, {
			username,
			socketId: socket.id,
		});
	});

	socket.on(SocketEvent.VOICE_MUTE, ({ username, isMuted }) => {
		const roomId = getRoomId(socket.id);
		if (!roomId) return;

		socket.broadcast.to(roomId).emit(SocketEvent.VOICE_MUTE, {
			username,
			isMuted,
			socketId: socket.id,
		});
	});

	// WebRTC signaling events for voice (audio only)
	socket.on(SocketEvent.VOICE_OFFER, ({ to, from, sdp }) => {
		if (!to || !from || !sdp) return;
		io.to(to).emit(SocketEvent.VOICE_OFFER, { from, sdp });
	});

	socket.on(SocketEvent.VOICE_ANSWER, ({ to, from, sdp }) => {
		if (!to || !from || !sdp) return;
		io.to(to).emit(SocketEvent.VOICE_ANSWER, { from, sdp });
	});

	socket.on(SocketEvent.VOICE_ICE_CANDIDATE, ({ to, from, candidate }) => {
		if (!to || !from || !candidate) return;
		io.to(to).emit(SocketEvent.VOICE_ICE_CANDIDATE, { from, candidate });
	});
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

server.listen(PORT, () => {
	console.log(`Listening on port ${PORT}`);
});
