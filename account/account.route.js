let router = require("express").Router();
let Account = require("./account.model");

/**
 * POST /api/account/register
 * Register for a new account. Required information consists of
 * (username, password, email, phone number).
 *
 * Returns the newly created user.
 */
router.post("/register", function(req, res) {
  let { username, password, email, phone } = req.body;
  Account.createAccount({ username, password, email, phone })
    .then(function(user) {
      console.log(user);
      res.status(201).send(user);
    })
    .catch((err) => {
      if (err.http) {
        res.status(err.http).send(err);
      } else {
        res.status(500).send(err);
      }
    });
});

module.exports = router;
