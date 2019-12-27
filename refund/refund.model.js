let db = require("../configs/db");
let { normaliseString } = require("../configs/types");
let moment = require("moment");

/**
 * Create a refund request.
 * @param {String} username Username of the user requesting a refund
 * @param {Number} transactionId
 * @param {String} reason
 */
async function createRefundRequest(username, transactionId, reason) {
  let transaction = await db
    .query(`SELECT * FROM transactions WHERE id=$1`, [transactionId])
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

  // A user can only ask for refund of their own transactions.
  if (transaction.username !== username) {
    throw {
      http: 401,
      code: "UNAUTHORISED",
      message: "Unauthorised"
    };
  }

  // Transaction must be finished beforehand for buyer to request for a refund.
  if (transaction.status !== true) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Cannot refund an unfinished transaction"
    };
  }

  // Request for refund can only be made within 3 days after transaction is finished.
  if (moment(transaction.finished_at).diff(moment.now()) <= 86400000 * 3) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Cannot request of refund after 3 days"
    };
  }

  let sql = `INSERT INTO refund_requests(transaction_id, reason) VALUES ($1, $2) RETURNING *`;
  return await db.query(sql, [transactionId, reason]).then(function({ rows }) {
    return rows[0];
  });
}

/**
 * Approve/Reject a refund request. Used by admins only.
 * @param {Number} transactionId
 * @param {Boolean} status
 */
async function approveRequest(transactionId, status) {
  let request = await db
    .query("SELECT * FROM refund_requests WHERE transaction_id=$1", [transactionId])
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw {
          http: 404,
          code: "NO_REQUEST",
          message: "No such request exists"
        };
      }
      return rows[0];
    });

  if (request.status !== null) {
    throw {
      http: 405,
      code: "NOT_ALLOWED",
      message: "Cannot approve/reject twice"
    };
  }

  let sql = `UPDATE refund_requests SET status=$1 WHERE transaction_id=$2`;
  return await db.query(sql, [status, transactionId]);
}

/**
 * Find all pending (new) refund requests.
 */
function findAllRequests() {
  let sql = `
  SELECT
    transaction_id,
    transactions.username as buyer,
    jobs.username as seller,
    jobs.name as job_name,
    job_types.name as job_type,
    jobs.description as job_description,
    refund_requests.created_at as created_at,
    reason,
    job_price_tiers.price as price,
    job_price_tiers.description as price_description
  FROM
    refund_requests
    JOIN transactions ON (refund_requests.transaction_id = transactions.id)
    JOIN jobs ON (transactions.job_id = jobs.id)
    JOIN job_types ON (jobs.type_id = job_types.id)
    JOIN job_price_tiers ON (transactions.job_id = job_price_tiers.job_id AND transactions.price = job_price_tiers.price)
  WHERE
    refund_requests.status IS NULL`;
  return db.query(sql).then(function({ rows }) {
    return rows;
  });
}

module.exports = {
  createRefundRequest,
  approveRequest,
  findAllRequests
};
