/**
 * Created by liqp on 2017/8/19.
 */
const ConfigdModel = require('../models/config').ConfigdModel;
const ObjectId = require('mongoose').Types.ObjectId;

exports.saveConfig = function (name, content, callback) {
	let doc = new ConfigdModel({
		_id: new ObjectId(),
		name: name,
		content: JSON.stringify(content)
	});

	let condition = {
		name: name,
	};

	ConfigdModel.remove(condition, function (err, result) {
		if (err) {
		    return callback(err)
		}

		doc.save(callback)
	});
};

exports.findConfig = function (name, callback) {
	let condition = {
		name: name,
	};

	ConfigdModel.findOne(condition)
		.exec(function (err, result) {
			if (err) {
			    return callback(err);
			}
			callback(null, JSON.parse(result.content))
		})
};