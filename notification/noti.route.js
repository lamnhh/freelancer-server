let router = require("express").Router();
let { tokenValidator } = require("../account/token");
let Notification = require("./noti.model");

/**
 * GET /api/notification/
 * Find all notifications of current user
 */
router.get("/", tokenValidator, function(req, res, next) {
  Notification.findAllNotifications(req.body.username)
    .then(function(notiList) {
      res.send(notiList);
    })
    .catch(next);
});

module.exports = router;
