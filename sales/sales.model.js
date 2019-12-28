let db = require("../configs/db");
let moment = require("moment");

/**
 * saleInfo contains information about sales for a time interval.
 * Some day/month has no information about them. This function is
 * to fill in those days/months with dummy data (zero).
 * @param {Array.<{date: Date, sum: Number, shares: Array.<{id: Number, name: String, sum: Number}>}>} saleInfo
 * @param {Number} count
 * @param {("day" | "month")} type
 */
function populate(saleInfo, count, type) {
  let now = moment();
  for (let i = 0; i < count; ++i) {
    let then = now.clone().subtract(i, type);
    let exists = !!saleInfo.find(function({ date }) {
      return moment(date)
        .startOf(type)
        .isSame(then.startOf(type));
    });
    if (!exists) {
      saleInfo.push({
        date: then.toDate(),
        sum: 0,
        shares: []
      });
    }
  }
  saleInfo = saleInfo
    .map(function({ date, sum, shares }) {
      return {
        date: moment(date).startOf(type),
        sum,
        shares
      };
    })
    .sort(function({ date: date1 }, { date: date2 }) {
      if (date1 < date2) {
        return -1;
      }
      if (date1 > date2) {
        return 1;
      }
      return 0;
    });
  return saleInfo;
}

/**
 * Summarize sales in the last <count> <type>.
 * @param {Number} count
 * @param {("day" | "month")} type
 */
function summary(count, type = "day") {
  let sql = `
  WITH agg1 AS (
    SELECT
      date_trunc('${type}', finished_at)::date as date,
      job_types.id as job_id,
      job_types.name as job_name,
      SUM(transactions.price) as sum
    FROM
      transactions
      LEFT JOIN refund_requests ON (transactions.id = refund_requests.transaction_id)
      JOIN jobs ON (transactions.job_id = jobs.id)
      JOIN job_types ON (jobs.type_id = job_types.id)
    WHERE
      transactions.status = TRUE AND
      refund_requests.transaction_id IS NULL AND 
      transactions.finished_at > NOW() - interval '${count} ${type}'
    GROUP BY
      date_trunc('${type}', finished_at)::date, job_types.id
  )
  SELECT
    date,
    SUM(sum) as sum,
    json_agg(
      json_build_object(
        'id', job_id,
        'name', RTRIM(job_name),
        'sum', sum
      )
    ) as shares
  FROM
    agg1
  GROUP BY 
    date
  ORDER BY
    date;`;

  return db.query(sql).then(function({ rows }) {
    return populate(rows, count, type);
  });
}

module.exports = {
  summary
};
