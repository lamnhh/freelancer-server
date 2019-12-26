let router = require("express").Router();
let Transaction = require("./transaction.model");
let { tokenValidator } = require("../account/token");

/**
 * GET /api/transaction
 * Return all transaction that the current user made.
 */
router.get("/", tokenValidator, function(req, res, next) {
  let { username } = req.body;
  Transaction.findAllTransactions(username)
    .then(function(transactionList) {
      res.send(transactionList);
    })
    .catch(next);
});

/**
 * GET /api/transaction/:id
 * Return a single transaction that the current user made.
 */
router.get("/:id", tokenValidator, function(req, res, next) {
  let transactionId = parseInt(req.params.id);
  if (isNaN(transactionId)) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid transaction ID" });
    return;
  }

  Transaction.findById(req.body.username, transactionId)
    .then(function(transaction) {
      res.send(transaction);
    })
    .catch(next);
});

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
