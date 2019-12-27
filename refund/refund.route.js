let router = require("express").Router();
let Refund = require("./refund.model");
let { tokenValidator, adminValidator } = require("../account/token");
let { isString } = require("../configs/types");

/**
 * GET /api/refund
 * Find all new (hasn't been approved/rejected) refund requests.
 * Used by admins only.
 */
router.get("/", adminValidator, function(req, res, next) {
  Refund.findAllRequests()
    .then(function(requestList) {
      res.send(requestList);
    })
    .catch(next);
});

/**
 * POST /api/refund/:id
 * Create a refund request for transaction `id`.
 * Request body must contain a string `reason`.
 */
router.post("/:id", tokenValidator, function(req, res, next) {
  let { username, reason } = req.body;
  let transactionId = parseInt(req.params.id);
  if (isNaN(transactionId)) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid transaction ID" });
    return;
  }
  if (!isString(reason)) {
    next({ http: 400, code: "INVALID_REASON_TYPE", message: "Reason must be a string" });
    return;
  }

  Refund.createRefundRequest(username, transactionId, reason)
    .then(function(request) {
      res.send(request);
    })
    .catch(next);
});

/**
 * POST /api/refund/:id/approve
 * Approve/reject the refund request on transaction `id`.
 * Used by admins only.
 * Request body must contain a boolean `status`.
 */
router.post("/:id/approve", adminValidator, function(req, res, next) {
  let transactionId = parseInt(req.params.id);
  let { status } = req.body;
  if (isNaN(transactionId)) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid transaction ID" });
    return;
  }
  if (typeof status !== "boolean") {
    next({ http: 400, code: "INVALID_STATUS", message: "Status must be a boolean" });
    return;
  }

  Refund.approveRequest(transactionId, status)
    .then(function() {
      res.send({ message: "Success" });
    })
    .catch(next);
});

module.exports = router;
