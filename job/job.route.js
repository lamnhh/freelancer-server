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
  let { page = 1, size = 10, username, search = "", typeId } = req.query;
  let lower = parseInt(req.query.lower || 0);
  let upper = parseInt(req.query.upper || 1000000000);
  if (isNaN(lower) || isNaN(upper) || lower < 0 || upper < 0) {
    next({ http: 400, code: "INVALID_LIMIT", message: "Lower and upper must be positive integer" });
    return;
  }

  Job.findAllJobs(page - 1, size, true, { lower, upper, username, search, typeId })
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
    if (price_list.length === 0) {
      throw "Price list must not be empty";
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

/**
 * PATCH /api/job/:id
 * Update a job.
 * Body can contain a subset of (name, description, type_id, cv_url, price_list).
 */
router.patch("/:id", tokenValidator, function(req, res, next) {
  let jobId = parseInt(req.params.id);
  if (isNaN(jobId)) {
    next({ http: 400, code: "INVALID_ID", message: "Invalid job ID" });
    return;
  }

  let { name, description, type_id, username, cv_url, price_list } = req.body;

  // Validate inputs
  try {
    if (
      (typeof name !== "undefined" && !isString(name)) ||
      (typeof description !== "undefined" && !isString(description)) ||
      (typeof cv_url !== "undefined" && !isString(cv_url)) ||
      (typeof cv_url !== "undefined" && !isURL(cv_url)) ||
      (typeof type_id !== "undefined" && isNaN(type_id)) ||
      (typeof price_list !== "undefined" && !Array.isArray(price_list))
    ) {
      throw "Please check the data type: name, description must be strings, cv_url must be a valid URL";
    }
    if (typeof name !== "undefined" && name.length > 100) {
      throw "Job name cannot contain more than 100 characters";
    }
    if (typeof cv_url !== "undefined" && cv_url > 200) {
      throw "URL is too long";
    }
    if (typeof price_list !== "undefined") {
      if (price_list.length === 0) {
        throw "Price list must not be empty";
      }
      price_list.forEach(function({ price, description }) {
        if (typeof price !== "number" || !isString(description)) {
          throw "Please check the price tiers: price and description must both be present";
        }
      });
    }
  } catch (message) {
    next({ http: 400, code: "INVALID_INFO", message });
  }

  let patch = {};
  if (typeof name !== "undefined") {
    patch.name = name;
  }
  if (typeof description !== "undefined") {
    patch.description = description;
  }
  if (typeof type_id !== "undefined") {
    patch.type_id = type_id;
  }
  if (typeof cv_url !== "undefined") {
    patch.cv_url = cv_url;
  }
  if (typeof price_list !== "undefined") {
    patch.price_list = price_list;
  }

  Job.updateJob(jobId, username, patch)
    .then(function(job) {
      res.send(job);
    })
    .catch(next);
});

module.exports = router;
