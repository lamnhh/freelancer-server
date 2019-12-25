let db = require("../configs/db");
let { normaliseString } = require("../configs/types");

/**
 * Returns list of jobs, sorted by date of creation.
 * Supports pagination, where:
 * @param {Number} page index of requested
 * @param {Number} size size of each page. Pass size=-1 to fetch all jobs
 * @param {Boolean} approved true/false whether to only return approved jobs or not
 */
function findAllJobs(page = 0, size = 10, approved = true) {
  let sql = `
  SELECT
    jobs.id as id,
    jobs.name as name,
    jobs.description as description,
    jobs.cv_url as cv_url,
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
  ${approved ? "WHERE jobs.status = TRUE" : ""}
  GROUP BY
    jobs.id, job_types.name, accounts.username
  ${size !== -1 ? `LIMIT ${size} OFFSET ${page * size}` : ""}
  `;
  return db.query(sql).then(function({ rows }) {
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
function findById(jobId, approved = true) {
  let sql = `
  SELECT
    jobs.id as id,
    jobs.name as name,
    jobs.description as description,
    jobs.cv_url as cv_url,
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
    jobs.id, job_types.name, accounts.username
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

    // Can only update when job isn't check by admins, or it was rejected.
    if (rows[0].status) {
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
  WHERE id=$${jobModifier.length + 1} AND username=$${jobModifier.length + 2}
  `;
  await db.query(sql, jobModifier.map((key) => patch[key]).concat([jobId, username]));

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

module.exports = {
  findAllJobs,
  findById,
  createJob,
  updateJob
};
