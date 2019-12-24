let router = require("express").Router();
let path = require("path");

let Account = require("./account/account.model");
let { generateToken } = require("./account/token");

router.post("/login", function(req, res, next) {
  let { username, password } = req.body;
  Account.login(username, password, true)
    .then(function(user) {
      if (!user.is_admin) {
        throw { http: 401, code: "UNAUTHORISED", message: "Unauthorised" };
      }
      req.session.token = "Bearer " + generateToken(username);
      res.redirect("/job-type");
    })
    .catch(next);
});

router.get("/logout", function(req, res, next) {
  if (req.session.token) {
    delete req.session.token;
  }
  res.redirect("/");
});

function sendFile(filename) {
  // Consider that /job-type is the homepage for admins.
  return function(req, res) {
    if (req.session.token) {
      // Logged in
      if (filename === "index.html") {
        res.redirect("/job-type");
      } else {
        res.sendFile(path.join(__dirname, "public", filename));
      }
    } else {
      // User is not logged in
      if (filename !== "index.html") {
        res.redirect("/");
      } else {
        res.sendFile(path.join(__dirname, "public", "index.html"));
      }
    }
  };
}

router.get("/", sendFile("index.html"));
router.get("/job-type", sendFile("job-type/job-type.view.html"));
router.get("/job-type/new", sendFile("job-type/job-type.new.html"));

module.exports = router;
