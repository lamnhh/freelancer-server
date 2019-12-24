let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

function findAllTypes() {
  return db.query("SELECT * FROM job_types").then(function({ rows }) {
    return rows.map(normaliseString);
  });
}

function findById(typeId) {
  return db.query("SELECT * FROM job_types WHERE id=$1", [typeId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_TYPE", message: "No such type" };
    }
    return normaliseString(rows[0]);
  });
}

function createType(typename) {
  return db
    .query("INSERT INTO job_types(name) VALUES ($1) RETURNING *", [typename])
    .then(function({ rows }) {
      return normaliseString(rows[0]);
    });
}

function deleteType(typeId) {
  return db
    .query("DELETE FROM job_types WHERE id=$1 RETURNING *", [typeId])
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw { http: 404, code: "NO_TYPE", message: "No such type" };
      }
      return normaliseString(rows[0]);
    });
}

function updateType(typeId, newName) {
  return db
    .query("UPDATE job_types SET name=$1 WHERE id=$2 RETURNING *", [newName, typeId])
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw { http: 404, code: "NO_TYPE", message: "No such type" };
      }
      return normaliseString(rows[0]);
    });
}

module.exports = {
  findAllTypes,
  findById,
  createType,
  deleteType,
  updateType
};
