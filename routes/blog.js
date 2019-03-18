const express = require('express');
const router = express.Router();
const path = require('path');
const util = require('util');
const async = require('async');
const category = require('../proxy/category');
const post = require('../proxy/post');
const tool = require('../utility/tool');
const moment = require('moment');
const url = require('url');
const configModel = require('../proxy/config');

//分类页面
router.get('/:category?', function (req, res, next) {
    let currentCate = req.params.category || '';
    async.parallel([
        //获取配置
        function (cb) {
            configModel.findConfig('settings', cb)
        },
        //获取分类
        function (cb) {
            category.getAll(function (err, categories) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, categories);
                }
            });
        }
    ], function (err, results) {
        let settings,
            categories,
            cate;
        if (err) {
            next(err);
        } else {
            settings = results[0];
            categories = results[1];
            cate = tool.jsonQuery(categories, {"Alias": currentCate});
            if (cate) {
                res.render('blog/index', {
                    cateData: categories,
                    settings: settings,
                    title: settings['SiteName'],
                    currentCate: currentCate,
                    isRoot: false
                });
            } else {
                next();
            }
        }
    });
});

//获取文章数据
router.post('/getPosts', function (req, res, next) {
    async.parallel([
        //获取文章列表和文章页数
        function (cb) {
            async.waterfall([
                //1. 根据分类alias获取分类对象
                function (cb) {
                    category.getByAlias(req.body.CateAlias, function (err, category) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, category);
                        }
                    });
                },
                //2. 传入分类对象查询文章
                function (category, cb) {
                    let params = {
                        cateId: category._id,
                        pageIndex: req.body.PageIndex,
                        pageSize: req.body.PageSize,
                        sortBy: req.body.SortBy,
                        keyword: req.body.Keyword,
                        filterType: req.body.FilterType
                    };
                    async.parallel([
                        //文章列表
                        function (cb) {
                            post.getPosts(params, function (err, data) {
                                if (err) {
                                    cb(err);
                                } else {
                                    cb(null, data);
                                }
                            });
                        },
                        //文章页数
                        function (cb) {
                            post.getPageCount(params, function (err, data) {
                                if (err) {
                                    cb(err);
                                } else {
                                    cb(null, data);
                                }
                            });
                        }
                    ], function (err, results) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null, results);
                        }
                    });
                }
            ], function (err, result) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, result);
                }
            });
        },
        //获取分类
        function (cb) {
            category.getAll(function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, data);
                }
            })
        }
    ], function (err, results) {
        let posts,
            pageCount,
            categories,
            i,
            len,
            cateId,
            cateItem,
            result = [];
        if (err) {
            next(err);
        } else {
            posts = results[0][0];
            pageCount = results[0][1];
            categories = results[1];
            i = 0;
            len = posts.length;
            for (; i < len; i++) {
                result[i] = {
                    Source: posts[i].Source,
                    Alias: posts[i].Alias,
                    Title: posts[i].Title,
                    Url: posts[i].Url,
                    PublishDate: moment(posts[i].CreateTime).format('YYYY-MM-DD'),
                    Host: posts[i].Url ? url.parse(posts[i].Url).host : '',
                    Summary: posts[i].Summary,
                    UniqueId: posts[i].UniqueId,
                    ViewCount: posts[i].ViewCount
                };
                cateId = posts[i].CategoryId;
                cateItem = tool.jsonQuery(categories, {"_id": cateId});
                if (cateItem) {
                    result[i].CategoryAlias = cateItem.Alias;
                    result[i].CateName = cateItem.CateName;
                }
            }
            res.send({posts: result, pageCount: pageCount});
        }
    });
});

//根据文章alias获取预览数据
router.post('/getPreviewContent', function (req, res, next) {
    post.getPostByAlias(req.body.alias, function (err, data) {
        if (err) {
            next(err);
        } else {
            res.send({Content: data.Content, Labels: data.Labels});
        }
    })
});

//文章详细页
router.get('/:category/:article', function (req, res, next) {
    let alias = req.params.article,
        cateAlias = req.params.category;
    async.parallel([
        //获取配置
        function (cb) {
			configModel.findConfig('settings', cb)
        },
        //根据文章alias获取文章对象
        function (cb) {
            post.getPostByAlias(alias, function (err, data) {
                if (err) {
                    cb(err);
                } else if (data === null) {
                    next();
                } else {
                    cb(null, data);
                }
            });
        },
        //获取分类
        function (cb) {
            category.getAll(function (err, data) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, data);
                }
            })
        }
    ], function (err, results) {
        let settings,
            article,
            categories,
            trueCateAlias,
            labels,
            labelList = [];
        if (err) {
            next(err);
        } else {
            settings = results[0];
            article = results[1];
            categories = results[2];
            trueCateAlias = tool.jsonQuery(categories, {"_id": article.CategoryId}).Alias;
            if (cateAlias !== trueCateAlias) {
                res.redirect(util.format('/blog/%s/%s', trueCateAlias, alias));
            }

			let keywords = '';
			let description = article.Summary;

            labels = article.Labels;
            if (labels) {
                labels = JSON.parse(labels);
                labels.forEach(function (lbl) {
                    labelList.push(lbl.text);
                    keywords += `${lbl.text},`
                });
            }

            keywords = keywords.substring(0, keywords.length-1);

            let post = {
                UniqueId: article.UniqueId,
                Title: article.Title,
                CategoryAlias: cateAlias,
                CateName: tool.jsonQuery(categories, {"_id": article.CategoryId}).CateName,
                CreateTimeStr: moment(article.CreateTime).format('YYYY-MM-DD hh:mm'),
                ViewCount: article.ViewCount,
                LabelList: labelList,
                Summary: article.Summary,
                Content: article.Content
            };

            res.render('blog/article', {
                post: post,
                settings: settings,
                title: article.Title + ' - ' + settings['SiteName'],
                keywords: keywords,
				description: description
            });
        }
    });
});

module.exports = router;
