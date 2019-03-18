/**
 * Created by liqp on 2017/8/19.
 */
const async = require('async');
const path = require('path');
const config = require('../proxy/config');
const tool = require('../utility/tool');

const initAbout = function (cb) {
	tool.getConfig(path.join(__dirname, '../config/about.json'), function (err, result) {
		config.saveConfig('about', result, cb)
	});
};

const initSet = function (cb) {
	tool.getConfig(path.join(__dirname, '../config/settings.json'), function (err, result) {
		config.saveConfig('settings', result, cb)
	});
};

async.parallel({
	initAbout: initAbout,
	initSet: initSet,
},function (err, result) {
	console.log(result);
});