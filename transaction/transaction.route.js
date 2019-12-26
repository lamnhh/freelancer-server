let router = require("express").Router();
let Transaction = require("./transaction.model");
let { tokenValidator } = require("../account/token");

/**
 * POST /api/transaction
 * Create a new transaction. Request body must contain (jobId, price),
 * corresponds to a job price tier.
 */
router.post("/", tokenValidator, function(req, res, next) {
  let { username } = req.body;
  let jobId = parseInt(req.body.jobId);
  let price = parseInt(req.body.price);

  // Validation: jobId and price must both be positive integers.
  try {
    if (isNaN(jobId) || jobId <= 0) {
      throw "Job ID must be a positive integer";
    }
    if (isNaN(price) || price <= 0) {
      throw "Price must be a positive integer";
    }
  } catch (message) {
    next({ http: 400, code: "INVALID_INPUT", message });
    return;
  }

  Transaction.createTransaction(username, jobId, price)
    .then(function(transaction) {
      res.status(201).send(transaction);
    })
    .catch(next);
});

module.exports = router;
