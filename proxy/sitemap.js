/**
 * Created by liqp on 2017/8/22.
 */
const fs = require('fs');
const async = require('async');
const path = require('path');
const sm = require('sitemap');
const post = require('./post');
const category = require('./category');

exports.createMap = function (callback) {
	let URLS = [
		{ url: '/',  changefreq: 'monthly',  priority: 0.5 },
	];

	async.parallel({
		category: function (cb) {
			category.getAll(true, false, cb);
		},
	    article: function(cb){
			post.getAllUrl(cb)
	    },
	},function (err, results) {
		if (err) {
		    return callback(err)
		}

		let articles = results.article;
		let categorys = results.category;

		let typeKeyValues = {};

		categorys.forEach(function (item) {
			typeKeyValues[item._id] = item.Alias;
			URLS.push({
				url:'/blog/' + item.Alias,
				changefreq: 'monthly',
				priority: 0.5
			})
		});

		articles.forEach(function (item) {
			let cateAlias = typeKeyValues[item.CategoryId];
			URLS.push({
				url:'/blog/'+ cateAlias + '/' + item.Alias,
				changefreq: 'weekly',
				priority: 0.5
			})
		});

		let siteMapConfig = {
			hostname: global.config.sitemap.hostname,
			cacheTime: global.config.sitemap.cacheTime,
			urls: URLS
		};

		let sitemap = sm.createSitemap (siteMapConfig);
		let filePath = path.join(__dirname, '../public', 'sitemap.xml');
		fs.writeFileSync(filePath, sitemap.toString());
		callback(null, null);
	});
};