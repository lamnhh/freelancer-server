let db = require("../configs/db");
let bcrypt = require("bcrypt");
let { normaliseString } = require("../configs/types");
let { validateRegisterInput, validateLoginInput } = require("./account.helper");

function createAccount({ username, password, email, phone }) {
  // Validate user info
  let validationResult = validateRegisterInput({ username, password, email, phone });
  if (validationResult !== null) {
    throw { http: 400, code: "INVALID_INFO", message: validationResult };
  }

  let hashedPassword = bcrypt.hashSync(password, 10);
  return db
    .query("SELECT * FROM create_account($1, $2, $3, $4)", [username, hashedPassword, email, phone])
    .then(function({ rows }) {
      let user = normaliseString(rows[0]);
      user.username = user.username.trim();
      user.email = user.email.trim();
      delete user.password;
      delete user.is_admin;
      return user;
    })
    .catch(function(err) {
      if (err.hint) {
        throw { http: 400, code: "INVALID_INFO", message: err.hint };
      }
      throw err;
    });
}

function login(username, password, keepIsAdmin = false) {
  // Validate username and password
  let validationResult = validateLoginInput(username, password);
  if (validationResult !== null) {
    throw { http: 400, code: "INVALID_INFO", message: validationResult };
  }

  return db.query("SELECT * FROM accounts WHERE username=$1", [username]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_USER", message: "User does not exist" };
    }
    let user = normaliseString(rows[0]);
    if (bcrypt.compareSync(password, user.password)) {
      delete user.password;
      if (!keepIsAdmin) {
        delete user.is_admin;
      }
      return user;
    } else {
      throw { http: 400, code: "WRONG_PASSWORD", message: "Wrong password" };
    }
  });
}

/**
 * Find a user from database with a given username.
 * @param {String} username
 */
function findByUsername(username, keepIsAdmin = false) {
  return db.query("SELECT * FROM accounts WHERE username=$1", [username]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_USER", message: "User does not exist" };
    }
    let user = normaliseString(rows[0]);
    if (!keepIsAdmin) {
      delete user.is_admin;
    }
    delete user.password;
    return user;
  });
}

/**
 * Update current user's information.
 * @param {String} username
 * @param {Object} patch A dictionary of (key, value), where key is the field to be updated, value
 * is the new value of that field.
 */
function updateInformation(username, patch) {
  let modifier = Object.keys(patch)
    .map((key, idx) => `${key}=$${idx + 1}`)
    .join(", ");
  let lastIndex = Object.keys(patch).length + 1;

  return db
    .query(
      `UPDATE accounts SET ${modifier} WHERE username=$${lastIndex} RETURNING *`,
      Object.values(patch).concat(username)
    )
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw { http: 404, code: "NO_USER", message: "User does not exist" };
      }
      let user = normaliseString(rows[0]);
      delete user.password;
      delete user.is_admin;
      return user;
    });
}

module.exports = {
  createAccount,
  login,
  findByUsername,
  updateInformation
};
