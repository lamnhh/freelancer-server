let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Find all notifications (messages from 'system') of user `username`.
 * @param {String} username
 */
function findAllNotifications(username) {
  let sql = `
  SELECT id, content, created_at FROM messages
  WHERE username_from = 'system' AND username_to = $1
  ORDER BY created_at DESC`;

  return db.query(sql, [username]).then(function({ rows }) {
    return rows.map(normaliseString);
  });
}

/**
 * Create a new notification to `username` with content `content`.
 * @param {String} username
 * @param {String} content
 */
function createNotification(username, content) {
  let sql = `
  INSERT INTO messages(username_from, username_to, content)
  VALUES ('system', $1, $2)
  RETURNING *`;

  return db.query(sql, [username, content]).then(function({ rows }) {
    return normaliseString(rows[0]);
  });
}

module.exports = {
  findAllNotifications,
  createNotification
};
