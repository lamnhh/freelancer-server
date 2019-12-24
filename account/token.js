let jwt = require("jsonwebtoken");
let { isString } = require("../configs/types");

function generateToken(username) {
  let token = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: "1y"
  });
  return token;
}

function tokenValidator(req, res, next) {
  // Check if req.headers.authorization is in the form "Bearer <jwt>"
  let auth = req.headers.authorization;
  if (!auth) {
    // req.headers.authorization not found
    res.status(401).send({ http: 401, code: "UNAUTHORISED", message: "Token required" });
    return;
  }
  let authTokens = auth.split(" ");
  if (authTokens.length !== 2 || authTokens[0] !== "Bearer") {
    res.status(401).send({ http: 401, code: "UNAUTHORISED", message: "Invalid token" });
    return;
  }

  let token = authTokens[1];
  try {
    // Verify token
    let payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload && isString(payload.username)) {
      req.body.username = payload.username;
      next();
    } else {
      throw null;
    }
  } catch (err) {
    res.status(401).send({ http: 401, code: "UNAUTHORISED", message: "Invalid token" });
  }
}

module.exports = {
  generateToken,
  tokenValidator
};
