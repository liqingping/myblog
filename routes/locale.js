const express = require('express');
const router = express.Router();
const path = require('path');

// Change website language
router.get('/locale/:lang', function(req, res, next){
  if(req.params.lang){
    // Set-Cookie for language/locale
    res.cookie('locale', req.params.lang, { maxAge: 900000, httpOnly: true });
  }
  res.redirect('/');
});

module.exports = router;
