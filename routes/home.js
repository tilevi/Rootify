
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    
    var a_token = req.query.access_token;
    var r_token = req.query.refresh_token;
    
    res.render('home', { access_token: a_token, refresh_token: r_token });
});

module.exports = router;