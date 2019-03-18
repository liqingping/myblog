/**
 * Created by liqp on 2017/8/18.
 */
const qiniu = require('qiniu');
const redis   = require('redis').createClient('6379', '127.0.0.1');
const config = global.config;

let options = {
	scope: config.qiniu.scope,
};

const Config = new qiniu.conf.Config();
Config.zone = config.qiniu.zone;

const formUploader = new qiniu.form_up.FormUploader(Config);
const putExtra = new qiniu.form_up.PutExtra();


class QiniuUpload {
	static token(cb){  //把上传凭证存到redis中
		redis.get('qiniuToken',function (err, result) {
			if (result) {
				return cb(result)
			}

			let mac = new qiniu.auth.digest.Mac(config.qiniu.access, config.qiniu.secret);
			let putPolicy = new qiniu.rs.PutPolicy(options);
			let uploadToken = putPolicy.uploadToken(mac);

			redis.setex('qiniuToken', 3600, uploadToken, function () {});
			cb(uploadToken);
		});
	};
	file(Path, key, cb){
		QiniuUpload.token(function (token) {
			formUploader.putFile(token, key, Path, putExtra, cb);
		})

	};
	string(String, key, cb){
		QiniuUpload.token(function (token) {
			formUploader.put(token, key, String, putExtra, cb);
		});
	};
	stream(Stream, key, cb){
		QiniuUpload.token(function (token) {
			formUploader.putStream(token, key, Stream, putExtra, cb);
		});

	};
}

exports.QiniuClient = new QiniuUpload();