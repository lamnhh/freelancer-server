let router = require("express").Router();
let Job = require("./job.model");
let { tokenValidator } = require("../account/token");
let { isString } = require("../configs/types");
let { isURL } = require("validator");

/**
 * GET /api/job
 * Returns all approved jobs
 */
router.get("/", function(req, res, next) {
  Job.findAllJobs()
    .then(function(jobList) {
      res.send(jobList);
    })
    .catch(next);
});

/**
 * GET /api/job/:id
 * Returns a given job. That job must be an approved job, otherwise the
 * request will resolve into a 404.
 */
router.get("/:id", function(req, res, next) {
  let jobId = parseInt(req.params.id);
  if (isNaN(jobId)) {
    next({ http: 400, code: "INVALID_ID", message: "ID is invalid" });
    return;
  }

  Job.findById(jobId)
    .then(function(job) {
      res.send(job);
    })
    .catch(next);
});

/**
 * POST /api/job
 * Create a new job. Body must contain (name, description, type_id, cv_url).
 * Username is fetched from request headers.
 */
router.post("/", tokenValidator, function(req, res, next) {
  let { name, description, type_id, username, cv_url, price_list } = req.body;

  // Validate inputs
  try {
    if (
      !isString(name) ||
      !isString(description) ||
      !isString(cv_url) ||
      !isURL(cv_url) ||
      isNaN(type_id) ||
      !Array.isArray(price_list)
    ) {
      throw "Please check the data type: name, description must be strings, cv_url must be a valid URL";
    }
    if (name.length > 100) {
      throw "Job name cannot contain more than 100 characters";
    }
    if (cv_url > 200) {
      throw "URL is too long";
    }
    price_list.forEach(function({ price, description }) {
      if (typeof price !== "number" || !isString(description)) {
        throw "Please check the price tiers: price and description must both be present";
      }
    });
  } catch (message) {
    next({ http: 400, code: "INVALID_INFO", message });
  }

  Job.createJob(name, description, type_id, username, cv_url, price_list)
    .then(function(job) {
      res.status(201).send(job);
    })
    .catch(next);
});

module.exports = router;