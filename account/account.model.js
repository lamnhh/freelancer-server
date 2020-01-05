let db = require("../configs/db");
let bcrypt = require("bcrypt");
let { normaliseString } = require("../configs/types");
let { validateRegisterInput, validateLoginInput } = require("./account.helper");

function createAccount({ username, password, email, phone }) {
  // Validate user info
  let validationResult = validateRegisterInput({ username, password, email, phone });
  if (validationResult !== null) {
    throw { http: 400, code: "INVALID_INFO", message: validationResult };
  }

  let hashedPassword = bcrypt.hashSync(password, 10);
  return db
    .query("SELECT * FROM create_account($1, $2, $3, $4)", [username, hashedPassword, email, phone])
    .then(function({ rows }) {
      let user = normaliseString(rows[0]);
      user.username = user.username.trim();
      user.email = user.email.trim();
      delete user.password;
      delete user.is_admin;
      return user;
    })
    .catch(function(err) {
      if (err.hint) {
        throw { http: 400, code: "INVALID_INFO", message: err.hint };
      }
      throw err;
    });
}

function login(username, password, keepIsAdmin = false) {
  // Validate username and password
  let validationResult = validateLoginInput(username, password);
  if (validationResult !== null) {
    throw { http: 400, code: "INVALID_INFO", message: validationResult };
  }

  return db.query("SELECT * FROM accounts WHERE username=$1", [username]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_USER", message: "User does not exist" };
    }
    let user = normaliseString(rows[0]);
    if (bcrypt.compareSync(password, user.password)) {
      delete user.password;
      if (!keepIsAdmin) {
        delete user.is_admin;
      }
      return user;
    } else {
      throw { http: 400, code: "WRONG_PASSWORD", message: "Wrong password" };
    }
  });
}

/**
 * Find a user from database with a given username.
 * @param {String} username
 */
function findByUsername(username, keepIsAdmin = false) {
  return db.query("SELECT * FROM accounts WHERE username=$1", [username]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_USER", message: "User does not exist" };
    }
    let user = normaliseString(rows[0]);
    if (!keepIsAdmin) {
      delete user.is_admin;
    }
    delete user.password;
    return user;
  });
}

/**
 * Update current user's information.
 * @param {String} username
 * @param {Object} patch A dictionary of (key, value), where key is the field to be updated, value
 * is the new value of that field.
 */
function updateInformation(username, patch) {
  let modifier = Object.keys(patch)
    .map((key, idx) => `${key}=$${idx + 1}`)
    .join(", ");
  let lastIndex = Object.keys(patch).length + 1;

  return db
    .query(
      `UPDATE accounts SET ${modifier} WHERE username=$${lastIndex} RETURNING *`,
      Object.values(patch).concat(username)
    )
    .then(function({ rows }) {
      if (rows.length !== 1) {
        throw { http: 404, code: "NO_USER", message: "User does not exist" };
      }
      let user = normaliseString(rows[0]);
      delete user.password;
      delete user.is_admin;
      return user;
    });
}

/**
 * Find all reviews of all jobs of user `username`.
 * @param {String} username
 */
function findReview(username) {
  let sql = `
  SELECT
    transactions.username,
    transactions.finished_at as created_at,
    review as content,
    json_build_object(
      'name', RTRIM(jobs.name),
      'description', jobs.description,
      'price', job_price_tiers.price,
      'price_description', job_price_tiers.description
    ) as job
  FROM
    transactions
    JOIN jobs ON (transactions.job_id = jobs.id)
    JOIN job_price_tiers ON (transactions.job_id = job_price_tiers.job_id AND transactions.price = job_price_tiers.price)
  WHERE
    review IS NOT NULL AND jobs.username = $1
  ORDER BY
  transactions.finished_at DESC;`;

  return db.query(sql, [username]).then(function({ rows }) {
    return rows.map(normaliseString);
  });
}

/**
 * Find all skills of user `username`.
 * @param {String} username
 */
function findSkill(username) {
  let sql = `
  SELECT
    job_types.id,
    RTRIM(job_types.name) as name
  FROM
    jobs
    JOIN job_types ON (jobs.type_id = job_types.id)
  WHERE
    username = $1
  GROUP BY
    job_types.id;`;
  return db.query(sql, [username]).then(function({ rows }) {
    return rows;
  });
}

module.exports = {
  createAccount,
  login,
  findByUsername,
  updateInformation,
  findReview,
  findSkill
};
