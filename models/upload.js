/**
 * Created by liqp on 2017/8/18.
 */
const db = require('./db'),
	mongoose = db.mongoose,
	base = db.base;

let uploadSchema = base.extend({
	//标题
	Type: {type: String},
	//外链Url
	Url: {type: String}
});

exports.UploadModel = mongoose.model('upload', uploadSchema, 'upload');