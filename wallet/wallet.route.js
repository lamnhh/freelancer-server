let router = require("express").Router();
let Account = require("../account/account.model");
let Wallet = require("./wallet.model");
let { tokenValidator } = require("../account/token");
let { isString } = require("../configs/types");

/**
 * Verify password
 * @param {{body: { username: String, password: String}}} req Express' request object after tokenValidator
 */
function verifyUser(req) {
  let { username, password } = req.body;
  if (!isString(password)) {
    throw { http: 401, code: "UNAUTHORISED", message: "Password is required" };
  }
  return Account.login(username, password);
}

/**
 * GET /api/wallet
 * Query current user's balance.
 */
router.get("/", tokenValidator, function(req, res, next) {
  let { username } = req.body;
  Wallet.queryBalance(username)
    .then(function(balance) {
      res.send({ balance });
    })
    .catch(next);
});

/**
 * POST /api/wallet
 * Update current user's balance. (Don't ask me why this exists :c).
 * Request body must contain `password` and `amount`.
 */
router.post("/", tokenValidator, function(req, res, next) {
  let amount = parseInt(req.body.amount);
  if (isNaN(amount)) {
    next({ http: 400, code: "INVALID_AMOUNT", message: "Invalid amount" });
    return;
  }

  verifyUser(req)
    .then(function(user) {
      return Wallet.updateBalance(user.username, amount);
    })
    .then(function(balance) {
      res.send({ balance });
    })
    .catch(next);
});

/**
 * GET /api/wallet/history
 * Return all past transactions of current user.
 */
router.get("/history", tokenValidator, function(req, res, next) {
  Wallet.findHistory(req.body.username)
    .then(function(history) {
      res.send(history);
    })
    .catch(next);
});

module.exports = router;
