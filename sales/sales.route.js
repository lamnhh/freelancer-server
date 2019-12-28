let router = require("express").Router();
let Sales = require("./sales.model");
let { adminValidator } = require("../account/token");

/**
 * GET /api/sales?type=<type>&count=<count>
 * Return a list of income (sales) for the last <count> <type>s, where type is "day" or "month".
 * Response body will be a list of objects, each of which contains a sum and an array
 * describing the share of each job type in that sum.
 */
router.get("/", adminValidator, function(req, res, next) {
  let count = parseInt(req.query.count);
  let type = req.query.type;
  if (isNaN(count)) {
    next({ http: 400, code: "INVALID_COUNT", message: "Count must be an integer" });
    return;
  }
  if (type !== "day" && type !== "month") {
    next({ http: 400, code: "INVALID_TYPE", message: "Type must be either 'day' or 'month'" });
    return;
  }

  Sales.summary(count, type)
    .then(function(rows) {
      res.send(rows);
    })
    .catch(next);
});

module.exports = router;
