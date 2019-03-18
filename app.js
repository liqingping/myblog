const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const route = require('./routes/index');
const blog = require('./routes/blog');
const misc = require('./routes/misc');
const auth = require('./routes/auth');
const admin = require('./routes/admin');
const locale = require('./routes/locale');
const ue = require('./routes/ue');
const logger = require('./utility/logger');
const passport = require('passport');
const i18n = require('./models/i18n');
const config = require('./config');
const fs = require('fs');

const app = express();

global.config = config;
global.logger = logger;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

morgan.format('joke', '[joke] :date[iso] --:method  --:url');
// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
// app.use(morgan('joke'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
// i18n init parses req for language headers, cookies, etc.
app.use(i18n.init);

app.use(session({
    secret: 'iblog-exp-session',
    cookie: {
        maxAge: 24 * 60 * 60 * 1000
    },
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());
app.use('*',function (req, res, next) {
    res.header("Content-Security-Policy: upgrade-insecure-requests");
    next()
});

//seo爬虫处理
app.use('*', function (req, res, next) {
	let fileName = req.originalUrl.replace(/\//g, '-');
	let user_agent = req.headers['user-agent'].toLowerCase();
	let spider = false;
	let spider_user_agent = ['baiduspider','googlebot','360spider','sogou'];

	let filePath = path.join(__dirname, './public/dist', `${fileName}.html`);
	spider_user_agent.forEach(function (item) {
		if (user_agent.indexOf(item) >= 0) {
			spider = true;
		}
	});

	if (spider && req.method.toLowerCase() == 'get') {
		let stream = fs.createReadStream(filePath);

		logger.info(`  --${req.originalUrl}   --${user_agent}`);
		stream.on('error', function (e) {
			let err = new Error();
			err.status = 404;
			next(err);
		});

		stream.pipe(res);

	}else{
		next();
	}
});

app.use('/', route);
app.use('/', locale);
app.use('/', misc);
app.use('/', auth);
app.use('/blog', blog);
app.use('/admin', require('connect-ensure-login').ensureLoggedIn('/login'), admin);
app.use('/ue/controller', ue);

// app.use('*',function (req, res, next) {
//     console.log(req.originalUrl);
//     if (req.originalUrl.indexOf('php') > 0 || req.originalUrl.indexOf('.jsp') > 0) {
// 		res.end('fuck, SB')
//     }else{
//         next()
//     }
//
// });


// catch 404 and forward to error handler
app.use(function (req, res, next) {
    let err = new Error();
    err.status = 404;
    next(err);
});

// error handlers
app.use(function (err, req, res, next) {
    let code = err.status || 500,
        message = code === 404 ? res.__('error.404_1') : res.__('error.404_2');
    res.status(code);
    logger.errLogger(req, err);
    res.render('./shared/error', {
        code: code,
        message: message
    });
});

module.exports = app;
