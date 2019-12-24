let db = require("../configs/db");
let bcrypt = require("bcrypt");
let { isEmail } = require("validator");
let { isString } = require("../configs/types");

function validateUserInfo({ username, password, email, phone }) {
  if (!isString(username) || !isString(password) || !isString(email) || !isString(phone)) {
    return "Invalid info";
  }
  if (username.length > 16) {
    return "Username cannot contain more than 16 characters";
  }
  if (password.length < 6) {
    return "Password must contain at least 6 characters";
  }
  if (!isEmail(email)) {
    return "Email is not valid";
  }
  if (phone.length !== 10 || isNaN(parseInt(phone))) {
    // Phone must be exactly 10 DIGITS long.
    return "Phone is not valid";
  }
  return null;
}

function createAccount({ username, password, email, phone }) {
  // Validate user info
  let validationResult = validateUserInfo({ username, password, email, phone });
  if (validationResult !== null) {
    throw { http: 400, code: "INVALID_INFO", message: validationResult };
  }

  let hashedPassword = bcrypt.hashSync(password, 10);
  return db
    .query("SELECT * FROM create_account($1, $2, $3, $4)", [username, hashedPassword, email, phone])
    .then(function({ rows }) {
      let user = rows[0];
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

module.exports = {
  createAccount
};
