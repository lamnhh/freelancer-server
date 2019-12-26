let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Create a new transaction.
 * Remember, a seller's service is determined by (jobId, price).
 * @param {String} username Username of buyer (user that buys the job)
 * @param {Number} jobId ID of said job
 * @param {Number} price Price that buyer chose
 */
async function createTransaction(username, jobId, price) {
  // Check if jobId is a valid job ID.
  await db.query("SELECT * FROM jobs WHERE id=$1", [jobId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_JOB", message: `No job with ID '${jobId}' exists` };
    }

    let job = normaliseString(rows[0]);
    if (job.username === username) {
      // A user cannot buy their own job.
      throw { http: 400, code: "NOT_ALLOWED", message: "You cannot buy your own job" };
    }
  });

  return await db
    .query(`INSERT INTO transactions(username, job_id, price) VALUES ($1, $2, $3) RETURNING *`, [
      username,
      jobId,
      price
    ])
    .then(function({ rows }) {
      // Return newly created transaction
      return rows[0];
    });
}

module.exports = {
  createTransaction
};
