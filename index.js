let express = require("express");
let morgan = require("morgan");
let cors = require("cors");

let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use(cors());

// Routing starting here
app.use("/api/account", require("./account/account.route"));
// Routing ending here

app.use(function(err, req, res, next) {
  res.status(500).send(err);
});

let port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Server is running on port " + port);
});
