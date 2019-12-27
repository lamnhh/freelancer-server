let db = require("../configs/db");
let Account = require("../account/account.model");
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
    transactions.created_at as created_at,
    transactions.job_id as job_id,
    jobs.name as job_name,
    jobs.description as job_description,
    json_build_object(
      'username', accounts.username,
      'fullname', accounts.fullname
    ) as seller,
    transactions.review as review,
    transactions.status as is_finished,
    CASE
      WHEN refund_requests.transaction_id IS NOT NULL THEN json_build_object(
        'created_at', refund_requests.created_at,
        'reason', refund_requests.reason,
        'status', refund_requests.status
      )
      ELSE NULL
    END as refund
  FROM
    transactions
    JOIN jobs ON (transactions.job_id = jobs.id)
    JOIN job_price_tiers ON (transactions.job_id = job_price_tiers.job_id AND transactions.price = job_price_tiers.price)
    JOIN accounts ON (jobs.username = accounts.username)
    LEFT JOIN refund_requests ON (refund_requests.transaction_id = transactions.id)
  WHERE
    transactions.username=$1
  ORDER BY
    created_at DESC`;
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
    transactions.created_at as created_at,
    transactions.job_id as job_id,
    jobs.name as job_name,
    jobs.description as job_description,
    json_build_object(
      'username', accounts.username,
      'fullname', accounts.fullname
    ) as seller,
    transactions.review as review,
    transactions.status as is_finished,
    CASE
      WHEN refund_requests.transaction_id IS NOT NULL THEN json_build_object(
        'created_at', refund_requests.created_at,
        'reason', refund_requests.reason,
        'status', refund_requests.status
      )
      ELSE NULL
    END as refund
  FROM
    transactions
    JOIN jobs ON (transactions.job_id = jobs.id)
    JOIN job_price_tiers ON (transactions.job_id = job_price_tiers.job_id AND transactions.price = job_price_tiers.price)
    JOIN accounts ON (jobs.username = accounts.username)
    LEFT JOIN refund_requests ON (refund_requests.transaction_id = transactions.id)
  WHERE
    transactions.id=$1`;
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
  let job = await db.query("SELECT * FROM jobs WHERE id=$1", [jobId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_JOB", message: `No job with ID '${jobId}' exists` };
    }

    return normaliseString(rows[0]);
  });

  // A user cannot buy their own job.
  if (job.username === username) {
    throw { http: 400, code: "NOT_ALLOWED", message: "You cannot buy your own job" };
  }

  // Payment must be made before transaction is created.
  await db.query("SELECT * FROM transfer_money($1, $2, $3, $4)", [
    username,
    job.username,
    price,
    job.name
  ]);

  return await db
    .query(
      `INSERT INTO transactions(username, job_id, price, status) VALUES ($1, $2, $3, FALSE) RETURNING *`,
      [username, jobId, price]
    )
    .then(function({ rows }) {
      // Return newly created transaction
      return normaliseString(rows[0]);
    });
}

/**
 * Add review.
 * Only buyer can review the transaction.
 * @param {String} username Buyer
 * @param {Number} transactionId
 * @param {String} review
 */
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

  // Cannot review unless transaction is finished (status = true)
  if (transaction.status !== true) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Transaction has yet to be finished, cannot review"
    };
  }

  return await db.query("UPDATE transactions SET review=$1 WHERE id=$2", [review, transactionId]);
}

/**
 * Mark a transaction as "finished" after buyer has received their product(s).
 * In database, this "finished" is described using field `status`: true/false <=> finished/unfinished.
 * Note that by a transaction's existence in the database means it has been paid beforehand.
 * User HAS to re-login to perform this action.
 * @param {String} username
 * @param {String} password
 * @param {Number} transactionId
 */
async function markAsFinished(username, password, transactionId) {
  // Check if password is correct
  await Account.login(username, password);

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

  // Only the transaction's buyer can mark it as finished
  if (transaction.username !== username) {
    throw {
      http: 401,
      code: "UNAUTHORISED",
      message: "Unauthorised"
    };
  }

  // Transaction is already finished, cannot mark again
  if (transaction.status === true) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Cannot mark twice"
    };
  }

  return db.query("UPDATE transactions SET status = TRUE, finished_at = NOW() WHERE id=$1", [
    transactionId
  ]);
}

module.exports = {
  findAllTransactions,
  findById,
  createTransaction,
  addReview,
  markAsFinished
};
