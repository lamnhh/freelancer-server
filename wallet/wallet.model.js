let db = require("../configs/db");

/**
 * Activate a wallet for user with given username.
 * Here, assume that user has NOT activate their wallet.
 * @param {String} username
 */
async function activateWallet(username) {
  let walletId = await db
    .query(`INSERT INTO wallets(balance) VALUES (0) RETURNING id`)
    .then(({ rows }) => rows[0].id);
  await db.query(`UPDATE accounts SET wallet_id=$1 WHERE username=$2`, [walletId, username]);
  return walletId;
}

/**
 * Query current user's balance.
 * @param {Number} walletId
 */
function queryBalance(walletId) {
  if (walletId === null) {
    throw { http: 404, code: "NO_WALLET", message: "Wallet has not been activated" };
  }
  return db
    .query("SELECT balance FROM wallets WHERE id=$1", [walletId])
    .then(({ rows }) => rows[0].balance);
}

/**
 * Top up current user's wallet.
 * Amount must be greater than 0.
 * @param {Number} walletId
 * @param {Number} amount
 */
function topup(walletId, amount) {
  if (walletId === null) {
    throw { http: 404, code: "NO_WALLET", message: "Wallet has not been activated" };
  }
  return db
    .query(
      `UPDATE wallets
      SET balance = balance + $1 
      WHERE id = $2
      RETURNING balance`,
      [amount, walletId]
    )
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw { http: 404, code: "NO_WALLET", message: "Wallet does not exists" };
      }
      // Return new balance
      return rows[0].balance;
    });
}

module.exports = {
  activateWallet,
  queryBalance,
  topup
};
