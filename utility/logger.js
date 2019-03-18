const winston = require('winston');
const dbPath = require('../config').mongodb.dbPath;
const os = require('os');
require('winston-mongodb').MongoDB;
let logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            json: true,
            colorize: true,
            level: 'info',
            handleExceptions: true
        }),

        new (winston.transports.MongoDB)({
            db: dbPath,
            level: 'info', //会记录info、warn、error3个级别的日志
            handleExceptions: true
        })
    ],
    exitOnError: false
});

/**
 * 记录错误日志
 * @param req 请求对象
 * @param err 错误对象
 */
exports.errLogger = function (req, err) {
    let obj = {},
        message = err.message;
    obj.process = {
        pid: process.pid,
        uid: process.getuid ? process.getuid() : null,
        gid: process.getgid ? process.getgid() : null,
        cwd: process.cwd(),
        execPath: process.execPath,
        version: process.version,
        argv: process.argv,
        memoryUsage: process.memoryUsage()
    };
    obj.os = {
        hostname: os.hostname(),
        loadavg: os.loadavg(),
        uptime: os.uptime()
    };
    obj.stack = err.stack && err.stack.split('\n');
    obj.code = err.status || 500;
    let query = {};
    for (let q in req.query) {
        query[q] = req.query[q];
    }
    obj.req = {
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        query: query,
        body: req.body,
        ip: req.ip,
        route: req.route
    };
    if (!message && obj.code === 404) {
        message = 'not fount "' + req.originalUrl + '"';
    }
    logger.error(message, obj);
};
exports.info = function (message) {
    logger.info(new Date().toISOString() + message)
};
