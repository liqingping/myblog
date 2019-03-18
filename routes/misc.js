const express = require('express');
const router = express.Router();
const path = require('path');
const async = require('async');
const tool = require('../utility/tool');
const configModel = require('../proxy/config');

//留言页面
router.get('/guestbook', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('misc/guestbook', {
				title: res.__("misc.msg") + ' - ' + settings['SiteName'],
				settings: settings
			});
		}
	});
});

//关于页面
router.get('/about', function (req, res, next) {
    async.parallel([
        //获取关于数据
        function (cb) {
            configModel.findConfig('about', cb)
        },
        //获取配置
        function (cb) {
			configModel.findConfig('settings', cb)
        }
    ], function (err, results) {
        let about,
            settings;
        if (err) {
            next(err);
        } else {
            about = results[0];
            settings = results[1];
            res.render('misc/about', {
                title: res.__('misc.about') + ' - ' + settings['SiteName'],
                about: about,
                settings: settings
            });
        }
    });
});

module.exports = router;
