let router = require("express").Router();
let Account = require("../account/account.model");
let Wallet = require("./wallet.model");
let { tokenValidator } = require("../account/token");
let { isString } = require("../configs/types");

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
  verifyUser(req)
    .then(function(user) {
      return Wallet.queryBalance(user.wallet_id);
    })
    .then(function(balance) {
      res.send({ balance });
    })
    .catch(next);
});

/**
 * POST /api/wallet/activate
 * Activate current user's wallet.
 */
router.post("/activate", tokenValidator, function(req, res, next) {
  verifyUser(req)
    .then(function(user) {
      if (user.wallet_id) {
        throw { http: 400, code: "ACTIVATED", message: "Cannot activate wallet twice" };
      }
      return Wallet.activateWallet(user.username);
    })
    .then(function() {
      res.send({ message: "Wallet is successfully activated" });
    })
    .catch(next);
});

/**
 * POST /api/wallet/topup
 * Topup current user's wallet. (Don't ask me why this exists :c).
 */
router.post("/topup", tokenValidator, function(req, res, next) {
  let amount = parseInt(req.body.amount);
  if (isNaN(amount)) {
    next({ http: 400, code: "INVALID_AMOUNT", message: "Invalid amount" });
    return;
  }

  verifyUser(req)
    .then(function(user) {
      return Wallet.topup(user.wallet_id, amount);
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
  verifyUser(req)
    .then(function(user) {
      return Wallet.findHistory(user.wallet_id);
    })
    .then(function(history) {
      res.send(history);
    })
    .catch(next);
});

module.exports = router;
