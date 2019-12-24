let { Pool } = require("pg");
require("dotenv").config();

// Connect using connection string if available.
// Otherwise, connect using credentials.
let config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL
    }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT
    };

let pool = new Pool(config);

module.exports = pool;
