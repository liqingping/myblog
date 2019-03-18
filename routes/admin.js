const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const async = require('async');
const upload = require('jquery-file-upload-middleware');
const post = require('../proxy/post');
const category = require('../proxy/category');
const log = require('../proxy/log');
const sitemap = require('../proxy/sitemap');
const tool = require('../utility/tool');
const moment = require('moment');
const shortid = require('shortid');
const redisClient = require('../utility/redisClient');
const uploadModel = require('../proxy/upload');
const phantomModel = require('../proxy/phantom');
const configModel = require('../proxy/config');
const formidable = require('formidable');
const qiniu = require('../server/qiniu').QiniuClient;

const qiniuHost = global.config.qiniu.host;

//上传配置
upload.configure({
    uploadDir: path.join(__dirname, '../public/images/'),
    uploadUrl: '/images'
});

//网站统计页面
router.get('/', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/index', {
				settings: settings,
				title: res.__("layoutAdmin.web_statistic")+ ' - ' + settings['SiteName']
			});
		}
	});
});

//分类管理页面
router.get('/categorymanage', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/categorymanage', {
				settings: settings,
				title:res.__("layoutAdmin.classified_management") + ' - ' + settings['SiteName']
			});
		}
	});
});

//获取分类数据，不含所有和未分类，不走缓存
router.post('/getCategories', function (req, res, next) {
    category.getAll(false, false, function (err, data) {
        if (err) {
            next(err);
        } else {
            res.json(data);
        }
    });
});

//保存分类数据
router.post('/saveCategories', function (req, res, next) {
    let jsonArray = JSON.parse(req.body.json.substr(1, req.body.json.length - 2));
    category.save(jsonArray, function (err) {
        if (err) {
            next(err);
        } else {
            res.end();
        }
    });
});

//文章管理页面
router.get('/articlemanage', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/articlemanage', {
				settings: settings,
				title: res.__("layoutAdmin.article_management") + ' - ' + settings['SiteName']
			});
		}
	});
});

//获取分类数据，包含所有和未分类，不走缓存
router.post('/getCateFilter', function (req, res, next) {
    category.getAll(true, false, function (err, data) {
        if (err) {
            next(err);
        } else {
            res.json(data);
        }
    });
});
//获取分类数据，包含所有和未分类，不走缓存
router.get('/getCateFilter', function (req, res, next) {
	category.getAll(true, false, function (err, data) {
		if (err) {
			next(err);
		} else {
			res.json(data);
		}
	});
});

//获取文章列表数据
router.post('/getArticles', function (req, res, next) {
    let filter,
        params = {
            pageIndex: req.body.pageNumber,
            pageSize: req.body.pageSize,
            sortName: req.body.sortName,
            sortOrder: req.body.sortOrder,
            searchText: req.body.searchText
        };
    if (req.body.filter) {
        filter = JSON.parse(req.body.filter);
        params.cateId = filter.CateName;
        params.uniqueId = filter.UniqueId;
        params.title = filter.Title;
    }
    async.parallel([
        //获取文章列表
        function (cb) {
            post.getArticles(params, function (err, posts) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, posts);
                }
            });
        },
        //获取文章总数
        function (cb) {
            post.getArticlesCount(params, function (err, count) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, count);
                }
            });
        },
        //获取分类
        function (cb) {
            category.getAll(true, false, function (err, categories) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, categories);
                }
            });
        }
    ], function (err, results) {
        let posts,
            count,
            categories,
            post,
            cateId,
            cateItem,
            result = [];
        if (err) {
            next(err);
        } else {
            posts = results[0];
            count = results[1];
            categories = results[2];
            posts.forEach(function (item) {
                post = {
                    UniqueId: item._id,
                    Alias: item.Alias,
                    Title: item.Title,
                    CreateTime: moment(item.CreateTime).format('YYYY-MM-DD HH:mm:ss'),
                    ModifyTime: moment(item.ModifyTime).format('YYYY-MM-DD HH:mm:ss'),
                    Summary: item.Summary,
                    ViewCount: item.ViewCount,
                    Source: item.Source,
                    Url: item.Url,
                    IsDraft: item.IsDraft,
                    IsActive: item.IsActive
                };
                cateId = item.CategoryId;
                cateItem = tool.jsonQuery(categories, {"_id": cateId});
                if (cateItem) {
                    post.CategoryAlias = cateItem.Alias;
                    post.CateName = cateItem.CateName;
                }
                result.push(post);
            });
            res.json({
                rows: result,
                total: count
            });
        }
    });
});

//新的文章页面
router.get('/newArticle', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/newarticle', {
				uniqueId: shortid.generate(),
				settings: settings,
				title: res.__("layoutAdmin.new_article") + ' - ' + settings['SiteName']
			});
		}
	});
});

//检查文章Alias是否唯一
router.post('/checkArticleAlias', function (req, res, next) {
    post.checkAlias(req.body.Alias, req.body.uid, function (err, isValid) {
        if (err) {
            next(err);
        } else {
            res.json({
                valid: isValid
            });
        }
    })
});

//保存文章
router.post('/saveArticle', function (req, res, next) {
    let params = {
        UniqueId: req.body.UniqueId,
        Title: req.body.Title,
        Alias: req.body.Alias,
        Summary: req.body.Summary,
        Source: req.body.Source,
        Content: req.body.Content,
        CategoryId: req.body.CategoryId,
        Labels: req.body.Labels,
        Url: req.body.Url,
        IsDraft: req.body.IsDraft
    };
    post.save(params, function (err) {
        if (err) {
            return next(err);
        }
        //生成sitemap
        sitemap.createMap(function () {});

        //生成seo预加载页面
		let urls = ['/','/blog'];

		category.getById(req.body.CategoryId, function (err, categorys) {
			if (err) {
			    return logger.log(err);
			}

			if (req.body.CategoryId === 'other') {
				urls.push(`/blog/other/${req.body.Alias}`);
			}else{
				urls.push(`/blog/${categorys.Alias}/${req.body.Alias}`);
			}

			category.getAll(true, false, function (err, categories) {
				if (err) {
					return logger.log(err);
				}

				categories.forEach(function (item) {
					if (item.Alias !='') {
					    urls.push(`/blog/${item.Alias}`)
					}
				});

				async.eachLimit(urls, 1, function(url, cb){
					phantomModel.getStaticPage(url,cb)
				},function(err, result){
					if(err){
						return logger.log(err);
					}
				});
			});

		});
		res.end();

    })
});

//修改文章
router.get('/editArticle/:id', function (req, res, next) {
    let id = req.params.id;
    if (!id) {
        res.redirect('/admin/articlemanage');
    }
    async.parallel([
        //获取分类
        function (cb) {
            configModel.findConfig('settings', cb)
        },
        //根据文章Id获取文章
        function (cb) {
            post.getById(id, function (err, article) {
                if (err) {
                    cb(err);
                } else if (!article) {
                    next();
                } else {
                    cb(null, article);
                }
            })
        }
    ], function (err, results) {
        let settings,
            article;
        if (err) {
            next(err);
        } else {
            settings = results[0];
            article = results[1];
            res.render('admin/editarticle', {
                settings: settings,
                post: article,
                title: res.__("layoutAdmin.edit_article") + ' - ' + settings['SiteName']
            });
        }
    });
});

//删除文章
router.post('/deleteArticles', function (req, res, next) {
    post.delete(req.body.ids, function (err) {
        if (err) {
            next(err);
        } else {
            res.end();
        }
    })
});

//还原文章
router.post('/undoArticle', function (req, res, next) {
    post.undo(req.body.id, function (err) {
        if (err) {
            next(err);
        } else {
            res.end();
        }
    })
});

//评论管理页面
router.get('/comments', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/comments', {
				settings: settings,
				title: res.__("layoutAdmin.comment_management") + ' - ' + settings['SiteName']
			});
		}
	});

});

//留言管理页面
router.get('/guestbook', function (req, res, next) {
    configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/guestbook', {
				settings: settings,
				title:  res.__("layoutAdmin.msg_management") + ' - ' +settings['SiteName']
			});
		}
	});
});

//关于管理页面
router.get('/aboutmanage', function (req, res, next) {
    async.parallel([
        //获取关于数据
        function (cb) {
            configModel.findConfig('about',cb);
        },
        //获取配置
        function (cb) {
			configModel.findConfig('settings',cb);
        }
    ], function (err, results) {
        let settings,
            about;
        if (err) {
            next(err);
        } else {
            about = results[0];
            settings = results[1];
            res.render('admin/aboutmanage', {
                title: res.__("layoutAdmin.about_management") + ' - ' + settings['SiteName'],
                about: about,
                settings: settings
            });
        }
    });
});

//上传图片
router.post('/uploadimg', function (req, res, next) {
	let contentLength = req.headers['content-length'];

	if (contentLength < 1) {
		return next(new Error('request entity too small'));
	}

	if (contentLength > 10485760) {
		return next(new Error('request entity too large'));
	}

	const form = new formidable.IncomingForm();

	form.keepExtensions = true;
	form.maxFieldsSize = 1024;
	form.multiples = true;
	form.maxFields = 10;

	let filename = '';
	let key ='';

	form.onPart = function (stream) {
		let self = this;

		let name = stream.name;
		filename = stream.filename;
		let filemime = stream.mime;

		key = 'category/' + filename;

		if (!filename) {
			return;
		}

		self._flushing++;

		let writeStream = fs.createWriteStream(path.join(__dirname, '../public/images', filename));

		writeStream.on('close', function () {
			self._flushing--;
			self._maybeEnd();
		});

		writeStream.on('error', function (error) {
			console.error(error);
			self._flushing--;
			self._maybeEnd();
		});

		stream.pipe(writeStream);
	};

	form
		.on('error', function (err) {
			return next(err);
		})
		.on('end', function () {
		    let filePath = path.join(__dirname, '../public/images', filename);
		    let stream = fs.createReadStream(filePath);

			qiniu.stream(stream, key, function (err, body, status) {
				fs.unlink(filePath,function () {});

				if (err || status.statusCode != 200) {
					return next(new Error('upload is err'));
				}

				let url = `${qiniuHost}${body.key}`;

				uploadModel.saveUrl('category', url, function (err, result) {});
				res.json({url:url});
			});
		})
		.parse(req);
});

//保存关于数据
router.post('/saveAbout', function (req, res, next) {
    let content =  {
		FirstLine: req.body.FirstLine,
		SecondLine: req.body.SecondLine,
		PhotoPath: req.body.PhotoPath,
		ThirdLine: req.body.ThirdLine,
		Profile: req.body.Profile,
		Wechat: req.body.Wechat,
		QrcodePath: req.body.QrcodePath,
		Email: req.body.Email
	};

    configModel.saveConfig('about', content, function (err, result) {
		res.end();
	});
});

//缓存管理页面
router.get('/cachemanage', function (req, res, next) {
    configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/cachemanage', {
				settings: settings,
				title: res.__("layoutAdmin.cache_management") + ' - ' + settings['SiteName']
			});
		}
	});
});

//根据缓存key获取缓存
router.post('/getcache', function (req, res, next) {
    redisClient.getItem(req.body.key, function (err, data) {
        if (err) {
            next(err);
        } else {
            if (data) {
                res.json(data);
            } else {
                res.end();
            }
        }
    })
});

//清除指定key的缓存
router.post('/clearcache', function (req, res, next) {
    redisClient.removeItem(req.body.key, function (err) {
        if (err) {
            next(err);
        } else {
            res.end();
        }
    })
});

//异常管理页面
router.get('/exception', require('connect-ensure-login').ensureLoggedIn(), function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/exception', {
				settings: settings,
				title: res.__("layoutAdmin.exception_management") + ' - ' + settings['SiteName']
			});
		}
	});
});

//获取异常数据
router.post('/getExceptions', function (req, res, next) {
    let params = {
        pageIndex: req.body.pageNumber,
        pageSize: req.body.pageSize,
        sortName: req.body.sortName,
        sortOrder: req.body.sortOrder
    };
    async.parallel([
        //获取异常列表
        function (cb) {
            log.getAll(params, function (err, logs) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, logs);
                }
            });
        },
        //获取异常数据总数
        function (cb) {
            log.getAllCount(params, function (err, count) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, count);
                }
            })
        }
    ], function (err, results) {
        let logs,
            count,
            result = [];
        if (err) {
            next(err);
        } else {
            logs = results[0];
            count = results[1];
            logs.forEach(function (item) {
                result.push({
                    message: item.message,
                    time: moment(item.timestamp).format('YYYY-MM-DD HH:mm:ss.SSS'),
                    level: item.level,
                    meta: item.meta
                });
            });
            res.json({
                rows: result,
                total: count
            });
        }
    });
});

//系统设置页面
router.get('/settings', function (req, res, next) {
	configModel.findConfig('settings', function (err, settings) {
		if (err) {
			next(err);
		} else {
			res.render('admin/settings', {
				settings: settings,
				title: res.__("layoutAdmin.settings") + ' - ' + settings['SiteName']
			});
		}
	});
});

//保存系统设置
router.post('/saveSettings', function (req, res, next) {
    let content = {
		SiteName: req.body.SiteName,
		SiteDomain: req.body.SiteDomain,
		RecordNo: req.body.RecordNo,
		LogoPath: req.body.LogoPath,
		PageSize: req.body.PageSize,
		ExpandMenu: req.body.ExpandMenu,
		CacheExpired: req.body.CacheExpired,
		TranslateKey: req.body.TranslateKey,
		EnableStatistics: req.body.EnableStatistics,
		StatisticsId: req.body.StatisticsId,
		EnableShare: req.body.EnableShare,
		JiaThisId: req.body.JiaThisId,
		ShowComments: req.body.ShowComments,
		ShowGuestbook: req.body.ShowGuestbook,
		ChangyanId: req.body.ChangyanId,
		ChangyanConf: req.body.ChangyanConf
    };

    configModel.saveConfig('settings', content, function (err, result) {
		res.end();
	});
});

module.exports = router;
