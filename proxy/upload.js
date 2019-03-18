/**
 * Created by liqp on 2017/8/18.
 */
const UploadModel = require('../models/upload').UploadModel;
const ObjectId = require('mongoose').Types.ObjectId;

exports.saveUrl = function (type, url, callback) {
	let doc = new UploadModel({
		_id: new ObjectId(),
		Type: type,
		Url: url
	});

	doc.save(callback)
};

exports.findUrl = function (type, pageSkip, pageSize, callback) {
	let condition = {
		Type: type,
	};

	UploadModel.find(condition)
		.skip(parseInt(pageSkip))
		.limit(parseInt(pageSize))
		.exec(callback)
};