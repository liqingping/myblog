const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const async = require('async');
const category = require('../proxy/category');
const tool = require('../utility/tool');
const configModel = require('../proxy/config');

router.get('/', function (req, res, next) {
    async.parallel([
        //获取配置
        function (cb) {
            configModel.findConfig('settings', function (err, settings) {
				if (err) {
					cb(err);
				} else {
					cb(null, settings);
				}
			});
        },
        //获取分类
        function (cb) {
            category.getAll(function (err, categories) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, categories);
                }
            });
        }
    ], function (err, results) {
        let settings,
            categories;
        if (err) {
            next(err);
        } else {
            settings = results[0];
            categories = results[1];
            res.render('blog/index', {
                cateData: categories,
                settings: settings,
                title: settings['SiteName'],
                currentCate: '',
                isRoot: true,
                keywords: '学习记,李清平',
				description: '【学习记】，logoli（李清平）的个人博客，记录学习的过程，互相讨论新的技术，里面有nodejs，vue，mongo，' +
                'mysql，docker等一些新技术的文章，分享一些实际开发过程中需要的技术和观点。'
            });
        }
    });
});

router.get('/sitemap.xml', function (req, res, next) {
    let filePath = path.join(__dirname, '../public/sitemap.xml');
	let stream = fs.createReadStream(filePath, {
		flags: 'r'
	});

	stream.pipe(res);
});

module.exports = router;
