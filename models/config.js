/**
 * Created by liqp on 2017/8/19.
 */
const db = require('./db'),
	mongoose = db.mongoose,
	base = db.base;

let configSchema = base.extend({
	//标题
	name: {type: String},
	//外链Url
	content: {type: String}
});

exports.ConfigdModel = mongoose.model('config', configSchema, 'config');