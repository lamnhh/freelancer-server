let router = require("express").Router();
let Account = require("./account.model");
let { generateToken } = require("./token");

/**
 * POST /api/account/register
 * Register for a new account. Required information consists of
 * (username, password, email, phone number).
 *
 * Returns the newly created user along with a token.
 */
router.post("/register", function(req, res) {
  let { username, password, email, phone } = req.body;
  Account.createAccount({ username, password, email, phone })
    .then(function(user) {
      res.status(201).send({
        ...user,
        token: generateToken(username)
      });
    })
    .catch(function(err) {
      if (err.http) {
        res.status(err.http).send(err);
      } else {
        res.status(500).send(err);
      }
    });
});

/**
 * POST /api/account/login
 * Login.
 *
 * Returns user information along with a token.
 */
router.post("/login", function(req, res) {
  let { username, password } = req.body;
  Account.login(username, password)
    .then(function(user) {
      res.status(200).send({
        ...user,
        token: generateToken(username)
      });
    })
    .catch(function(err) {
      if (err.http) {
        res.status(err.http).send(err);
      } else {
        res.status(500).send(err);
      }
    });
});

module.exports = router;
