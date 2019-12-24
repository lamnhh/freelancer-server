/**
 * Check if a variable is a string or not.
 * @param {*} x
 * @returns true/false whether x is/is not a string.
 */
function isString(x) {
  return typeof x === "string" || x instanceof String;
}

/**
 * Normalise all string fields in an object from PostgreSQL.
 * @param {Object} obj
 * @returns normalised object
 */
function normaliseString(obj) {
  let ans = {};
  Object.keys(obj).forEach(function(key) {
    let value = obj[key];
    if (isString(value)) {
      value = value.trim();
    }
    ans[key] = value;
  });
  return ans;
}

module.exports = {
  isString,
  normaliseString
};
