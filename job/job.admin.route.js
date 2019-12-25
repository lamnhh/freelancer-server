let router = require("express").Router();
let Job = require("./job.model");
let { adminValidator } = require("../account/token");

/**
 * GET /api/job-admin
 * Returns all jobs
 */
router.get("/", function(req, res, next) {
  let page = (req.query.page || 1) - 1;
  let size = req.query.size || 10;
  Job.findAllJobs(page, size, false)
    .then(function(jobList) {
      res.send(jobList);
    })
    .catch(next);
});

/**
 * GET /api/job-admin/:id
 * Returns a given job.
 */
router.get("/:id", adminValidator, function(req, res, next) {
  let jobId = parseInt(req.params.id);
  if (isNaN(jobId)) {
    next({ http: 400, code: "INVALID_ID", message: "ID is invalid" });
    return;
  }

  Job.findById(jobId, false)
    .then(function(job) {
      res.send(job);
    })
    .catch(next);
});

/**
 * POST /api/job-admin/:id/approve
 * Approve/reject a job application.
 * Body must contain a field `status`, where `status` = 0 means rejection and
 * `status` = 1 means approval.
 */
router.post("/:id/approve", adminValidator, function(req, res, next) {
  let jobId = parseInt(req.params.id);
  if (isNaN(jobId)) {
    next({ http: 400, code: "INVALID_ID", message: "ID is invalid" });
    return;
  }

  let status = parseInt(req.body.status);
  if (isNaN(status) || status < 0 || status > 1) {
    next({ http: 400, code: "INVALID_STATUS", message: "Invalid status value" });
    return;
  }

  Job.approve(jobId, status)
    .then(function() {
      let state = status === 1 ? "approved" : "rejected";
      let message = `Job application with ID '${jobId}' has been ${state}`;
      res.send({
        code: "SUCCESS",
        message
      });
    })
    .catch(next);
});

module.exports = router;
