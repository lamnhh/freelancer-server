let express = require("express");
let morgan = require("morgan");
let cors = require("cors");
let session = require("express-session");
let path = require("path");
require("dotenv").config();

let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cors());

app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true
    }
  })
);

// Routing for APIs
app.use("/api/account", require("./account/account.route"));
app.use("/api/job-type", require("./job-type/job-type.route"));
app.use("/api/job", require("./job/job.route"));
app.use("/api/wallet", require("./wallet/wallet.route"));
app.use("/api/transaction", require("./transaction/transaction.route"));
app.use("/api/notification", require("./notification/noti.route"));

// Routing for admins' APIs
app.use("/api/job-admin", require("./job/job.admin.route"));

// Routing for admins' frontend
app.use("/", require("./admin.route"));

app.use(function(err, req, res, next) {
  if (err.http) {
    res.status(err.http).send(err);
  } else {
    res.status(500).send(err);
  }
});

let port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Server is running on port " + port);
});
