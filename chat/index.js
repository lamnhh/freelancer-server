let jwt = require("jsonwebtoken");
let Message = require("./message.model");
let { isString } = require("../configs/types");

/**
 * Extract username from a JWT.
 * @param {String} token
 */
function extractUsername(token) {
  let payload = jwt.verify(token, process.env.JWT_SECRET);
  if (payload && isString(payload.username)) {
    return payload.username;
  }
  throw null;
}

/**
 * Generate room name in case `sender` and `receiver` chooses to chat with each other.
 * Room name is generated as sum of their name, separated by a character |.
 * Note that their names are sorted first.
 * @param {String} sender
 * @param {String} receiver
 */
function generateRoomName(sender, receiver) {
  let a = [sender, receiver];
  a.sort();
  return a[0] + "|" + a[1];
}

function init(server) {
  let io = require("socket.io")(server);

  io.use(function(socket, next) {
    try {
      if (socket.handshake.query && socket.handshake.query.token) {
        socket.sender = extractUsername(socket.handshake.query.token);
        next();
      } else {
        throw null;
      }
    } catch (_) {
      next(new Error("Authentication Error"));
    }
  }).on("connection", function(client) {
    // Request to create chat room with `receiver`.
    client.on("chat-with", function(receiver) {
      let roomName = generateRoomName(client.sender, receiver);
      client.join(roomName);

      // Query chat history between the two users and send it to `sender`.
      Message.findHistory(client.sender, receiver).then(function(messageList) {
        client.emit("message", receiver, messageList);
      });
    });

    // Request to send a message to `receiver`.
    client.on("send", function(receiver, content) {
      let roomName = generateRoomName(client.sender, receiver);
      Message.sendMessage(client.sender, receiver, content).then(function(message) {
        // Send new message to both users.
        io.to(roomName).emit("message", receiver, [message]);
      });
    });

    // Request to stop chatting with `receiver`.
    client.on("leave", function(receiver) {
      let roomName = generateRoomName(client.sender, receiver);
      client.leave(roomName);
    });
  });
}

module.exports = init;
