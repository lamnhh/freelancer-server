let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Find chat history between 2 users
 * @param {String} sender
 * @param {String} receiver
 */
function findHistory(sender, receiver) {
  let sql = `
  SELECT *
  FROM messages
  WHERE (username_from = $1 AND username_to = $2) OR (username_from = $2 AND username_to = $1)`;
  return db.query(sql, [sender, receiver]).then(function({ rows }) {
    return rows.map(normaliseString);
  });
}

/**
 * Send a message
 * @param {String} sender
 * @param {String} receiver
 * @param {String} content
 */
function sendMessage(sender, receiver, content) {
  let sql = `
  INSERT INTO messages(username_from, username_to, content)
  VALUES ($1, $2, $3)
  RETURNING *`;
  return db.query(sql, [sender, receiver, content]).then(function({ rows }) {
    return normaliseString(rows[0]);
  });
}

module.exports = {
  findHistory,
  sendMessage
};
