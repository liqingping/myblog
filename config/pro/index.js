/**
 * Created by liqp on 2017/8/19.
 */
const qiniu = require('qiniu');
module.exports = {
	/*
	 * @desc 网站域名，生成sitemap
	 * */
	sitemap: {
		hostname: 'http://www.logoliqp.com',
		cacheTime: 600000
	},
	/*
	 * @desc mongodb配置文件
	 * */
	mongodb: {
		dbPath: "mongodb://blog:myblog@106.14.139.62/blog",
	},
	/*
	 * @desc redis配置文件
	 * */
	redis: {
		Active: true,
		Host: "127.0.0.1",
		Port: 6379
	},
	/*
	 * @desc 七牛上传配置文件
	 * */
	qiniu: {
		access: 'R07ZhnPByEBYUBxUfFHq40-ri5SJdiSwZJgUv8Eb',
		secret: '3dufzv-MKVvlTvYeL3tb7fgD5iN_b9FBM7MvX_H7',
		scope: 'blog',
		zone: qiniu.zone.Zone_z0,
		host: 'http://ouu5ea0z4.bkt.clouddn.com/'
	}
};
