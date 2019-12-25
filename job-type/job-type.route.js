let router = require("express").Router();
let JobType = require("./job-type.model");
let { isString } = require("../configs/types");
let { adminValidator } = require("../account/token");

/**
 * GET /api/job-type
 * Returns all job types available.
 */
router.get("/", function(req, res, next) {
  JobType.findAllTypes()
    .then(function(typeList) {
      res.send(typeList);
    })
    .catch(next);
});

/**
 * GET /api/job-type/:id
 * Returns a job type with given ID.
 */
router.get("/:id", function(req, res, next) {
  let typeId = parseInt(req.params.id);
  if (isNaN(typeId)) {
    next({
      http: 400,
      code: "INVALID_ID",
      message: "ID must be an integer"
    });
    return;
  }

  JobType.findById(typeId)
    .then(function(type) {
      res.send(type);
    })
    .catch(next);
});

/**
 * POST /api/job-type
 * Create a new job type.
 */
router.post("/", adminValidator, function(req, res, next) {
  let name = req.body.name;
  if (!isString(name) || name.length > 100) {
    next({
      http: 400,
      code: "INVALID_NAME",
      message: "Name must not be longer than 100 characters"
    });
    return;
  }

  JobType.createType(name)
    .then(function(type) {
      res.status(201).send(type);
    })
    .catch(next);
});

/**
 * Deprecated.
 * DELETE /api/job-type/:id
 * Delete a given job type.
 */
router.delete("/:id", adminValidator, function(req, res, next) {
  res.status(400).send({ message: "Don't call this" });
  return;
  // let typeId = parseInt(req.params.id);
  // if (isNaN(typeId)) {
  //   next({
  //     http: 400,
  //     code: "INVALID_ID",
  //     message: "ID must be an integer"
  //   });
  //   return;
  // }

  // JobType.deleteType(typeId)
  //   .then(function(deletedType) {
  //     res.send(deletedType);
  //   })
  //   .catch(next);
});

/**
 * PATCH /api/job-type/:id
 * Update name for a given type.
 */
router.patch("/:id", adminValidator, function(req, res, next) {
  let typeId = parseInt(req.params.id);
  if (isNaN(typeId)) {
    next({
      http: 400,
      code: "INVALID_ID",
      message: "ID must be an integer"
    });
    return;
  }

  let name = req.body.name;
  if (!isString(name) || name.length > 100) {
    next({
      http: 400,
      code: "INVALID_NAME",
      message: "Name must not be longer than 100 characters"
    });
    return;
  }

  JobType.updateType(typeId, name)
    .then(function(updatedType) {
      res.send(updatedType);
    })
    .catch(next);
});

module.exports = router;
