/**
 * Created by liqp on 2017/8/23.
 */
const phantom = require('phantom');
const fs = require('fs');
const path = require('path');


const hostname = 'http://localhost:3000';
exports.getStaticPage = function (url, callback) {
	(async function() {
		let URL = url;
		if (URL === '/') {
			URL = '/blog'
		}
		const instance = await phantom.create();
		const page = await instance.createPage();

		await page.property('viewportSize', {width: 1280, height: 1014});

		//请求页面静态资源
		await page.on("onResourceRequested", function(requestData) {});

		const status = await page.open(hostname + URL);

		const content = await page.property('content');

		setTimeout(function () {
			instance.exit();

			let fileName = url.replace(/\//g, '-');
			let filePath = path.join(__dirname, '../public/dist', `${fileName}.html`);

			fs.writeFileSync(filePath, content);
			callback(null, null)
		},100)
	}());
};
