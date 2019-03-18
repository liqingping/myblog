const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const tool = require('../utility/tool');
const multer = require('multer');
const shortid = require('shortid');
const upload = require('../proxy/upload');
const qiniu = require('../server/qiniu').QiniuClient;

const qiniuHost = global.config.qiniu.host;
//图片上传配置
let storageImg = multer.diskStorage({
    destination: function (req, file, cb) {
        if (req.query.uniqueId) {
            let dirPath = path.join(__dirname, '../public/uploads/');
			cb(null, dirPath);
        } else {
			cb(new Error('参数uniqueId不存在！'));
        }
    },
    filename: function (req, file, cb) {
        let fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.')) + '_' + shortid.generate();
        let ext = file.originalname.substr(file.originalname.lastIndexOf('.'));
        let fullName = fileName + ext;
        cb(null, fullName)
    }
});

//附件上传配置
let storageFile = multer.diskStorage({
    destination: function (req, file, cb) {
		if (req.query.uniqueId) {
			let dirPath = path.join(__dirname, '../public/uploads/');
			cb(null, dirPath);
		} else {
			cb(new Error('参数uniqueId不存在！'));
		}
    },
    filename: function (req, file, cb) {
        let fileName = file.originalname.substring(0, file.originalname.lastIndexOf('.')) + '_' + shortid.generate();
        let ext = file.originalname.substr(file.originalname.lastIndexOf('.'));
        let fullName = fileName + ext;
        cb(null, fullName)
    }
});

router.get('/', function (req, res, next) {
    let list = [];
    switch (req.query.action) {
        //获取配置
        case 'config':
            tool.getConfig(path.join(__dirname, '../config/ue.json'), function (err, settings) {
                if (err) {
                    next(err);
                } else {
                    res.json(settings);
                }
            });
            break;
        //图片管理
        case 'listimage':
            upload.findUrl('img', req.query.start, req.query.size, function (err, result) {
                if (err) {
                    return next(err)
                }

                result.forEach(function (img) {
                    list.push({
                        url: img.Url
                    })
				});

				res.json({
					state: list.length === 0 ? 'no match file' : 'SUCCESS',
					list: list,
					total: list.length,
					start: parseInt(req.query.start),
					size: parseInt(req.query.size)
				});
			});
            break;
        //附件管理
        case 'listfile':
			upload.findUrl('file', req.query.start, req.query.size, function (err, result) {
				if (err) {
					return next(err)
				}

				result.forEach(function (img) {
					list.push({
						url: img.Url
					})
				});

				res.json({
					state: list.length === 0 ? 'no match file' : 'SUCCESS',
					list: list,
					total: list.length,
					start: parseInt(req.query.start),
					size: parseInt(req.query.size)
				});
			});
			break;
    }
});

router.post('/', function (req, res, next) {
    let uploadFile;
    switch (req.query.action) {
        //上传图片
        case 'uploadimage':
            uploadFile = multer({storage: storageImg}).single('upfile');
            uploadFile(req, res, function (err) {
                if (err) {
                    next(err);
                } else {
                    let imgPath = path.join(__dirname, '../public/uploads/', req.file.filename);
                    let key = `img/${req.file.filename}`;

                    qiniu.file(imgPath, key, function (err, body, status) {
                        if (err || status.statusCode != 200) {
							next(new Error('upload is err'));
                        }

                        fs.unlink(imgPath,function () {});

                        let url = `${qiniuHost}${body.key}`;

                        upload.saveUrl('img', url, function (err, result) {});

						res.json({
							state: "SUCCESS",
							url: url,
							title: req.file.originalname,
							original: req.file.originalname,
							error: null
						});
					});
                }
            });
            break;
        //上传涂鸦
        case 'uploadscrawl':
            let dataBuffer = new Buffer(req.body.upfile, 'base64'),
                fileName = shortid.generate() + '.png';
            if (req.query.uniqueId) {
                let dirPath = path.join(__dirname, '../public/uploads/');

				fs.writeFile(path.join(dirPath, fileName), dataBuffer, function (err) {
					if (err) {
						next(err);
					} else {
						let imgPath = path.join(__dirname, '../public/uploads/', fileName);
						let key = `img/${fileName}`;

						qiniu.file(imgPath, key, function (err, body, status) {
							if (err || status.statusCode != 200) {
								next(new Error('upload is err'));
							}

							fs.unlink(imgPath,function () {});

							let url = `${qiniuHost}${body.key}`;

							upload.saveUrl('img', url, function (err, result) {});

							res.json({
								state: "SUCCESS",
								url: url,
								title: fileName,
								original: fileName,
								error: null
							});
						});
					}
				});
            } else {
                next(new Error('参数uniqueId不存在！'));
            }
            break;
        //上传附件
        case 'uploadfile':
            uploadFile = multer({storage: storageFile}).single('upfile');
            uploadFile(req, res, function (err) {
                if (err) {
                    next(err);
                } else {
					let imgPath = path.join(__dirname, '../public/uploads/', req.file.filename);
					let key = `file/${req.file.filename}`;

					qiniu.file(imgPath, key, function (err, body, status) {
						if (err || status.statusCode != 200) {
							next(new Error('upload is err'));
						}

						fs.unlink(imgPath,function () {});

						let url = `${qiniuHost}${body.key}`;

						upload.saveUrl('file', url, function (err, result) {});

						res.json({
							state: "SUCCESS",
							url: url,
							title: req.file.originalname,
							original: req.file.originalname,
							error: null
						});
					});
                }
            });
            break;
    }
});

module.exports = router;