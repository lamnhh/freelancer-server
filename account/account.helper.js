let { isEmail } = require("validator");
let { isString } = require("../configs/types");

function validateRegisterInput({ username, password, email, phone }) {
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

function validateLoginInput(username, password) {
  if (!isString(username) || !isString(password)) {
    return "Invalid info";
  }
  if (username.length > 16) {
    return "Username not found";
  }
  return null;
}

module.exports = {
  validateRegisterInput,
  validateLoginInput
};
