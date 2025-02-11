const USER_CONNECTION_STATUS = {
	OFFLINE: "offline",
	ONLINE: "online",
};

const User = {
	username: "",
	roomId: "",
	status: USER_CONNECTION_STATUS.OFFLINE,
	cursorPosition: 0,
	typing: false,
	currentFile: null,
	socketId: "",
};

module.exports = { USER_CONNECTION_STATUS, User };
