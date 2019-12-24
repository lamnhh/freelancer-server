let router = require("express").Router();
let Account = require("./account.model");
let { isEmail } = require("validator");
let { isString } = require("../configs/types");
let { generateToken, tokenValidator } = require("./token");

/**
 * POST /api/account/register
 * Register for a new account. Required information consists of
 * (username, password, email, phone number).
 *
 * Returns the newly created user along with a token.
 */
router.post("/register", function(req, res, next) {
  let { username, password, email, phone } = req.body;
  Account.createAccount({ username, password, email, phone })
    .then(function(user) {
      res.status(201).send({
        ...user,
        token: generateToken(username)
      });
    })
    .catch(next);
});

/**
 * POST /api/account/login
 * Login.
 *
 * Returns user information along with a token.
 */
router.post("/login", function(req, res, next) {
  let { username, password } = req.body;
  Account.login(username, password)
    .then(function(user) {
      res.status(200).send({
        ...user,
        token: generateToken(username)
      });
    })
    .catch(next);
});

/**
 * GET /api/account
 * Returns current user information.
 */
router.get("/", tokenValidator, function(req, res, next) {
  let { username } = req.body;
  Account.findByUsername(username)
    .then(function(user) {
      res.send(user);
    })
    .catch(next);
});

/**
 * PATCH /api/account
 * Update current user's information. Body should be a JSON object, containing
 * fields and respective values to be updated.
 * i.e. body might be { bio: "abc", citizen_id: "191908978" }
 *
 * Fields that are allowed to be updated: fullname, email, phone, bio, citizen_id.
 */
router.patch("/", tokenValidator, function(req, res, next) {
  let allowedFields = ["fullname", "email", "phone", "bio", "citizen_id"];
  let patch = {};
  try {
    allowedFields.forEach(function(key) {
      let value = req.body[key];
      if (typeof value === "undefined") {
        return;
      }
      if (!isString(value)) {
        throw key + " requires a string";
      }
      if (key === "email" && !isEmail(value)) {
        throw "Invalid email";
      }
      if (key === "phone" && value.length !== 10) {
        throw "Invalid phone number";
      }
      patch[key] = value;
    });
  } catch (message) {
    res.status(400).send({
      http: 400,
      code: "INVALID_INFO",
      message
    });
    return;
  }

  Account.updateInformation(req.body.username, patch)
    .then(function(newUser) {
      res.send(newUser);
    })
    .catch(function(err) {
      if (err.code === "23505") {
        // unique_violation
        // In this case, err contains a field "detail" which is in the form "Key (xyz)=(whatever) already exists."
        // We need to parse the "xyz" part out and send back to the client.
        let violatedField = err.detail.split("(")[1].split(")")[0];
        next({ http: 400, code: "UNIQUE_VIOLATION", message: violatedField + " already exists" });
      } else {
        next(err);
      }
    });
});

module.exports = router;
