let router = require("express").Router();
let Transaction = require("./transaction.model");
let { tokenValidator } = require("../account/token");
let { isString } = require("../configs/types");

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

/**
 * POST /api/transaction/:id/review
 * Add review. Request body must contain a single field `review` (string).
 */
router.post("/:id/review", tokenValidator, function(req, res, next) {
  let transactionId = parseInt(req.params.id);
  if (isNaN(transactionId) || transactionId <= 0) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid transaction ID" });
    return;
  }

  let { username, review } = req.body;
  if (!isString(review)) {
    next({ http: 400, code: "INVALID_REVIEW", message: "Review must be a string" });
    return;
  }

  Transaction.addReview(username, transactionId, review)
    .then(function() {
      res.send({ message: "Review added" });
    })
    .catch(next);
});

/**
 * POST /api/transaction/:id/finish
 * Mark a transaction as finished.
 */
router.post("/:id/finish", tokenValidator, function(req, res, next) {
  let transactionId = parseInt(req.params.id);
  if (isNaN(transactionId) || transactionId <= 0) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid transaction ID" });
    return;
  }

  Transaction.markAsFinished(req.body.username, transactionId)
    .then(function() {
      res.send({ message: "Transaction is finished" });
    })
    .catch(next);
});

module.exports = router;
