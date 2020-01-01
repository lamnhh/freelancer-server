let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Find walletId of user `username`.
 * @param {String} username
 */
function findByUsername(username) {
  let sql = `
  SELECT
    *
  FROM
    accounts
    JOIN wallets ON (accounts.wallet_id = wallets.id)
  WHERE
    username=$1`;
  return db.query(sql, [username]).then(function({ rows }) {
    if (rows.length !== 1) {
      // username does not exist, or their wallet has not been activate
      // (which should not happen)
      throw { http: 404, code: "NO_USER", message: `Username '${username}' does not exist` };
    }
    // Otherwise, rows[0] describes user `username` along with their wallet ID and balance.
    return rows[0];
  });
}

/**
 * Query current user's balance.
 * @param {String} username Username of current user
 */
async function queryBalance(username) {
  let wallet = await findByUsername(username);
  return wallet.balance;
}

/**
 * Update balance of user `username`: perform balance += amount.
 *    amount > 0: top up `amount`.
 *    amount < 0: withdraw `amount`.
 * @param {String} username Username of current user
 * @param {Number} amount Amount to top-up/withdraw
 */
function updateBalance(username, amount) {
  return db
    .query(`SELECT * FROM update_balance($1, $2)`, [username, amount])
    .then(function({ rows }) {
      // Return new balance
      return rows[0].new_balance;
    })
    .catch((err) => {
      if (err.hint) {
        // If transaction raises an exception with hint, it means that the user
        // has requested to withdraw more money than their current balance.
        // In this case, using err.hint to send back to the user.
        throw { http: 400, code: "INVALID_AMOUNT", message: err.hint };
      }
      throw err;
    });
}

/**
 * List all past transactions of current user, including top-ups and transfers.
 * @param {String} username Username of current user
 */
function findHistory(username) {
  let sql = `
  SELECT
    wallet_transactions.id,
    CASE 
      WHEN wallet_transactions.wallet_from != accounts.wallet_id THEN wallet_transactions.amount
      WHEN wallet_transactions.wallet_to != accounts.wallet_id THEN -wallet_transactions.amount
      ELSE wallet_transactions.amount
    END as amount,
    wallet_transactions.created_at,
    wallet_transactions.content
  FROM
    wallet_transactions
    JOIN accounts ON (
      wallet_transactions.wallet_from = accounts.wallet_id OR 
      wallet_transactions.wallet_to = accounts.wallet_id
    )
  WHERE
    accounts.username=$1
  ORDER BY
    created_at DESC`;
  return db.query(sql, [username]).then(function({ rows }) {
    return rows.map(normaliseString);
  });
}

module.exports = {
  queryBalance,
  updateBalance,
  findHistory
};
