let jwt = require("jsonwebtoken");
let { isString } = require("../configs/types");
let { findByUsername } = require("./account.model");

function generateToken(username) {
  let token = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1y"
  });
  return token;
}

/**
 * Extract username from the token in req.header.authorization
 * @param {*} req
 */
function extractUsername(req) {
  // Check if req.headers.authorization is in the form "Bearer <jwt>"
  let auth = req.headers.authorization;
  if (!auth) {
    // req.headers.authorization not found
    throw { http: 401, code: "UNAUTHORISED", message: "Token required" };
  }
  let authTokens = auth.split(" ");
  if (authTokens.length !== 2 || authTokens[0] !== "Bearer") {
    throw { http: 401, code: "UNAUTHORISED", message: "Invalid token" };
  }

  let token = authTokens[1];
  try {
    // Verify token
    let payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload && isString(payload.username)) {
      return payload.username;
    } else {
      throw null;
    }
  } catch (err) {
    throw { http: 401, code: "UNAUTHORISED", message: "Invalid token" };
  }
}

function tokenValidator(req, res, next) {
  try {
    let username = extractUsername(req);
    req.body.username = username;
    next();
  } catch (err) {
    next(err);
  }
}

async function adminValidator(req, res, next) {
  try {
    let username = extractUsername(req);
    let user = await findByUsername(username, true);
    if (user.is_admin) {
      req.body.username = username;
      next();
    } else {
      throw { http: 401, code: "UNAUTHORISED", message: "Unauthorised" };
    }
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateToken,
  tokenValidator,
  adminValidator
};
