const redis = require('redis');
const async = require('async');
const util = require('util');
const config = require('../config');
const configModel = require('../proxy/config');

const redisActive = config.redis.Active;

let client;
if (redisActive) {
    // use custom redis url or localhost
    client = redis.createClient(config.redis.Port || 6379, config.redis.Host || 'localhost');
    client.on('error', function (err) {
        console.error('Redis连接错误: ' + err);
        process.exit(1);
    });
}

/**
 * 设置缓存
 * @param key 缓存key
 * @param value 缓存value
 * @param expired 缓存的有效时长，单位秒
 * @param callback 回调函数
 */
exports.setItem = function (key, value, expired, callback) {
    if (!redisActive) {
        return callback(null);
    }

    client.set(key, JSON.stringify(value), function (err) {
        if (err) {
            return callback(err);
        }
        if (expired) {
            client.expire(key, expired);
        }
        return callback(null);
    });
};

/**
 * 获取缓存
 * @param key 缓存key
 * @param callback 回调函数
 */
exports.getItem = function (key, callback) {
    if (!redisActive) {
        return callback(null, null);
    }

    client.get(key, function (err, reply) {
        if (err) {
            return callback(err);
        }
        return callback(null, JSON.parse(reply));
    });
};

/**
 * 移除缓存
 * @param key 缓存key
 * @param callback 回调函数
 */
exports.removeItem = function (key, callback) {
    if (!redisActive) {
        return callback(null);
    }

    client.del(key, function (err) {
        if (err) {
            return callback(err);
        }
        return callback(null);
    });
};

/**
 * 获取默认过期时间，单位秒
 */
exports.defaultExpired = 30;
let find = util.promisify(configModel.findConfig);
let time;
(async function () {
	let result = await find('settings');
	time = result.CacheExpired
})();

// exports.defaultExpired = function () {
// 	(async function () {
// 		let result = await find('settings');
// 		time = result.CacheExpired
// 	})();
//     return time;
// };

