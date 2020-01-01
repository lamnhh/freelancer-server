let db = require("../configs/db");
let Account = require("../account/account.model");
let { normaliseString } = require("../configs/types");
let { createNotification } = require("../notification/noti.model");

/**
 * Returns list of jobs, sorted by date of creation.
 * Supports pagination, where:
 * @param {Number} page index of requested
 * @param {Number} size size of each page. Pass size=-1 to fetch all jobs
 * @param {Boolean} approved true/false whether to only return approved jobs or not
 * @param {Object} filters a dictionary of filters to apply
 */
function findAllJobs(page = 0, size = 10, approved = true, filters = {}) {
  let { lower = 0, upper = 1000000000, username, search = "", typeId } = filters;
  let sql = `
  SELECT
    jobs.id as id,
    jobs.name as name,
    jobs.description as description,
    jobs.cv_url as cv_url,
    jobs.status as status,
    job_types.id as type_id,
    job_types.name as type,
    accounts.username as username,
    accounts.fullname as fullname,
    json_agg(
      json_build_object(
        'price', job_price_tiers.price,
        'description', job_price_tiers.description
      )
    ) as price_list
  FROM jobs
    JOIN accounts ON (jobs.username = accounts.username)
    JOIN job_types ON (jobs.type_id = job_types.id)
    LEFT JOIN job_price_tiers ON (jobs.id = job_price_tiers.job_id)
  WHERE
    (jobs.status ${approved ? "=" : "IS NOT"} TRUE) AND 
    ($1 <= job_price_tiers.price) AND (job_price_tiers.price <= $2)
    AND ((jobs.name ILIKE $3) OR (jobs.description ILIKE $3))
    ${username ? "AND (jobs.username = $4)" : ""}
    ${typeId ? `AND (job_types.id = ${typeId})` : ""}
  GROUP BY
    jobs.id, job_types.id, job_types.name, accounts.username
  ${size !== -1 ? `LIMIT ${size} OFFSET ${page * size}` : ""}
  `;

  let params = [lower, upper, `%${search}%`];
  if (username) {
    params.push(username);
  }

  return db.query(sql, params).then(function({ rows }) {
    return rows.map(normaliseString).map(function(row) {
      row.price_list = row.price_list.map(normaliseString);
      return row;
    });
  });
}

/**
 * Returns a job, given its ID.
 * @param {Number} jobId: ID of the requested job
 * @param {Boolean} approved: true/false whether to only return approved jobs or not
 */
function findById(jobId, approved = false) {
  let sql = `
  SELECT
    jobs.id as id,
    jobs.name as name,
    jobs.description as description,
    jobs.cv_url as cv_url,
    jobs.status as status,
    job_types.id as type_id,
    job_types.name as type,
    accounts.username as username,
    accounts.fullname as fullname,
    json_agg(
      json_build_object(
        'price', job_price_tiers.price,
        'description', job_price_tiers.description
      )
    ) as price_list
  FROM jobs
    JOIN accounts ON (jobs.username = accounts.username)
    JOIN job_types ON (jobs.type_id = job_types.id)
    LEFT JOIN job_price_tiers ON (jobs.id = job_price_tiers.job_id)
  WHERE
    jobs.id = $1 ${approved ? "AND jobs.status = TRUE" : ""}
  GROUP BY
    jobs.id,  job_types.id, job_types.name, accounts.username
  `;

  return db.query(sql, [jobId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_JOB", message: `No job with ID '${jobId}' exists` };
    }
    return rows.map(normaliseString).map(function(row) {
      row.price_list = row.price_list.map(normaliseString);
      return row;
    })[0];
  });
}

/**
 * Create a new job
 * @param {String} name Short name of the job
 * @param {String} description Job description, should be more verbose than `name`
 * @param {Number} type_id ID of job type (job category)
 * @param {String} username Username of the user that created this job
 * @param {String} cv_url URL to curriculum vitae of said user. The CV should be optimized for THIS job
 * @param {Array} price_tier_list Array of price tiers, each should be in the form { price: int, description: text }.
 */
async function createJob(name, description, type_id, username, cv_url, price_tier_list) {
  // Verify if uploader has activated their wallet yet
  let uploader = await Account.findByUsername(username);
  if (uploader.wallet_id === null) {
    throw { http: 405, code: "WALLET_INACTIVE", message: "Please activate your wallet first" };
  }

  // First, create an entry in the table `jobs`, fetch its ID into jobId.
  let sql = `
  INSERT INTO jobs(name, description, type_id, username, cv_url) 
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id
  `;
  let jobId = await db
    .query(sql, [name, description, type_id, username, cv_url])
    .then(({ rows }) => rows[0].id);

  // Use jobId to create entries for price tiers.
  sql =
    "INSERT INTO job_price_tiers VALUES " +
    price_tier_list
      .map(function(_, idx) {
        let x = idx * 3 + 1;
        let y = idx * 3 + 2;
        let z = idx * 3 + 3;
        return `($${x}, $${y}, $${z})`;
      })
      .join(", ");
  let params = price_tier_list.reduce(function(acc, { price, description }) {
    return acc.concat([jobId, price, description]);
  }, []);
  await db.query(sql, params);

  return await findById(jobId, false);
}

/**
 * Update a job's information.
 * @param {Number} jobId ID of the job to be updated
 * @param {String} username Username of the user attempting to update this job
 * @param {Object} patch An object that contains all field be updated
 */
async function updateJob(jobId, username, patch) {
  // Check if jobId is valid
  await db.query("SELECT * FROM jobs WHERE id=$1", [jobId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_JOB", message: `No job with ID '${jobId}' exists` };
    }

    let job = normaliseString(rows[0]);

    // Only uploader can update a job
    if (job.username !== username) {
      throw {
        http: 401,
        code: "NOT_ALLOWED",
        message: `Only uploaders can make change to their jobs`
      };
    }

    // Can only update when job isn't check by admins, or it was rejected.
    if (job.status) {
      throw {
        http: 401,
        code: "NOT_ALLOWED",
        message: "This job is approved, it cannot be updated anymore"
      };
    }
  });

  let fields = ["name", "description", "type_id", "cv_url"];
  let jobModifier = fields.filter((key) => typeof patch[key] !== "undefined");

  // Update the job's entry in `jobs`
  let sql = `
  UPDATE jobs
  SET ${jobModifier
    .map((key, idx) => `${key}=$${idx + 1}`)
    .concat("status=NULL")
    .join(", ")}
  WHERE id=$${jobModifier.length + 1}
  `;
  await db.query(sql, jobModifier.map((key) => patch[key]).concat([jobId]));

  let { price_list: price_tier_list } = patch;
  if (typeof price_tier_list !== "undefined") {
    // Clear old price tiers
    await db.query("DELETE FROM job_price_tiers WHERE job_id=$1", [jobId]);

    // Use jobId to create entries for price tiers.
    sql =
      "INSERT INTO job_price_tiers VALUES " +
      price_tier_list
        .map(function(_, idx) {
          let x = idx * 3 + 1;
          let y = idx * 3 + 2;
          let z = idx * 3 + 3;
          return `($${x}, $${y}, $${z})`;
        })
        .join(", ");
    let params = price_tier_list.reduce(function(acc, { price, description }) {
      return acc.concat([jobId, price, description]);
    }, []);

    await db.query(sql, params);
  }

  return await findById(jobId, false);
}

/**
 * Approve/Reject a job
 * @param {Number} jobId
 * @param {Number} status
 */
function approve(jobId, status) {
  return db.query("SELECT * FROM jobs WHERE id=$1", [jobId]).then(function({ rows }) {
    if (rows.length !== 1) {
      throw { http: 404, code: "NO_JOB", message: `No job with ID '${jobId}' exists` };
    }
    if (rows[0].status) {
      throw {
        http: 400,
        code: "NOT_ALLOWED",
        message: `Job was approved, it cannot be changed anymore`
      };
    }

    // Create notification to freelancer (a.k.a. job.username)
    let job = normaliseString(rows[0]);
    let noti =
      status === 1
        ? `Congratulations. Your job application for '${job.name}' has been approved.`
        : `We are deeply sorry. Your job application for '${job.name}' has been rejected`;

    return Promise.all([
      db.query(`UPDATE jobs SET status=${status === 1 ? "TRUE" : "FALSE"} WHERE id=$1 `, [jobId]),
      createNotification(job.username, noti)
    ]);
  });
}

module.exports = {
  findAllJobs,
  findById,
  createJob,
  updateJob,
  approve
};
