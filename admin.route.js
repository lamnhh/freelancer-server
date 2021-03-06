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
      res.redirect("/dashboard");
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
  // Consider that /dashboard is the homepage for admins.
  return function(req, res) {
    if (req.session.token) {
      // Logged in
      if (filename === "login.html") {
        res.redirect("/dashboard");
      } else {
        res.sendFile(path.join(__dirname, "public", filename));
      }
    } else {
      // User is not logged in
      if (filename !== "login.html") {
        res.redirect("/");
      } else {
        res.sendFile(path.join(__dirname, "public", "login.html"));
      }
    }
  };
}

router.get("/", sendFile("login.html"));
router.get("/job-type", sendFile("job-type/job-type.view.html"));
router.get("/job-type/new", sendFile("job-type/job-type.new.html"));
router.get("/job-application", sendFile("job-application/job-application.html"));
router.get("/refund", sendFile("refund/refund.html"));
router.get("/dashboard", sendFile("dashboard.html"));

module.exports = router;
