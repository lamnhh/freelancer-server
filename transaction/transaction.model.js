let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Find all transactions that user `username` made.
 * @param {String} username
 */
function findAllTransactions(username) {
  let sql = `
  SELECT
    transactions.id as id,
    transactions.username as buyer,
    job_price_tiers.price as price,
    job_price_tiers.description as price_description,
    created_at,
    transactions.job_id as job_id,
    jobs.name as job_name,
    jobs.description as job_description,
    json_build_object(
      'username', accounts.username,
      'fullname', accounts.fullname
    ) as seller,
    transactions.review as review
  FROM
    transactions
    JOIN jobs ON (transactions.job_id=jobs.id)
    JOIN job_price_tiers ON (transactions.price = job_price_tiers.price)
    JOIN accounts ON (jobs.username = accounts.username)
  WHERE
    transactions.username=$1
  ORDER BY
    created_at DESC
  `;
  return db.query(sql, [username]).then(function({ rows }) {
    return rows.map(normaliseString).map(function(row) {
      row.seller = normaliseString(row.seller);
      return row;
    });
  });
}

/**
 * Return a single transaction from user `username`.
 * If `transactionId` does not belong to `username`, this will throw a 401.
 * @param {String} username
 * @param {Number} transactionId
 */
function findById(username, transactionId) {
  let sql = `
  SELECT
    transactions.id as id,
    transactions.username as buyer,
    job_price_tiers.price as price,
    job_price_tiers.description as price_description,
    created_at,
    transactions.job_id as job_id,
    jobs.name as job_name,
    jobs.description as job_description,
    json_build_object(
      'username', accounts.username,
      'fullname', accounts.fullname
    ) as seller,
    transactions.review as review
  FROM
    transactions
    JOIN jobs ON (transactions.job_id=jobs.id)
    JOIN job_price_tiers ON (transactions.price = job_price_tiers.price)
    JOIN accounts ON (jobs.username = accounts.username)
  WHERE
    transactions.id=$1
  `;
  return db.query(sql, [transactionId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw {
        http: 404,
        code: "NO_TRANSACTION",
        message: `No transaction with ID '${transactionId}' exists`
      };
    }

    let transaction = normaliseString(rows[0]);
    transaction.seller = normaliseString(transaction.seller);

    // If this transaction does not belong to `username`, throw a 401
    if (transaction.buyer !== username) {
      throw {
        http: 401,
        code: "UNAUTHORISED",
        message: "Unauthorised"
      };
    }

    return transaction;
  });
}

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

async function addReview(username, transactionId, review) {
  // Query corresponding transaction
  let transaction = await db
    .query("SELECT * FROM transactions WHERE id=$1", [transactionId])
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw {
          http: 404,
          code: "NO_TRANSACTION",
          message: `No transaction with ID '${transactionId}' exists`
        };
      }
      return normaliseString(rows[0]);
    });

  // Only transaction's buyer can add review
  if (transaction.username !== username) {
    throw {
      http: 401,
      code: "UNAUTHORISED",
      message: "Unauthorised"
    };
  }

  // Cannot review twice
  if (transaction.review !== null) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Cannot review twice"
    };
  }

  // TODO: Check transaction status before committing review.

  return await db.query("UPDATE transactions SET review=$1 WHERE id=$2", [review, transactionId]);
}

module.exports = {
  findAllTransactions,
  findById,
  createTransaction,
  addReview
};
