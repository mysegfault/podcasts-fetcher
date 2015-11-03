var Request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var http = require('http');
var colors = require('colors');
var sprintf = require("sprintf-js").sprintf;

// local configuration
var config = require('./podcasts_fetcher.json');

function run(RSSFeed) {
	var request = new Request(RSSFeed);
	var feedparser = new FeedParser([]);
	var cptEntries = 0;
	var feedFolder = '';

	request.on('error', function(error) {
		// handle any request errors
		console.error(error);
	});

	request.on('response', function(res) {
		var stream = this;

		if (res.statusCode !== 200) {
			return this.emit('error', new Error('Bad status code'));
		}

		stream.pipe(feedparser);
	});

	feedparser.on('error', function(error) {
		// always handle errors
	});

	feedparser.on('meta', function(meta) {
		feedFolder = config.download_folder + meta.author + '/' + meta.title + '/';
		//console.log('Creating folder:', feedFolder);

		mkdirSync(config.download_folder);
		mkdirSync(config.download_folder + this.meta.author);
		mkdirSync(feedFolder);
	});

	feedparser.on('readable', function() {

		var stream = this;
		var meta = this.meta;
		var item;

		while (item = stream.read()) {
			parseFeed(item);
			cptEntries++;
		}

	});

	feedparser.on('end', function() {
		console.log(String(cptEntries).cyan + ' podcasts have been downloaded to '.yellow + feedFolder.cyan + ' folder'.yellow);
	});

	function parseFeed(feed) {
		var title = '';
		var date = '';

		for (var i in feed) {

			if (i === 'title') {
				//console.log(i, feed[i]);
				title = feed[i];
				title = title.replace(/[^a-zA-Z- 0-9.\u00E0-\u00FC]/gi, '');
			}
			if (i === 'pubDate') {
				var dateObj = new Date(feed[i]);
				date = sprintf("%d-%02d-%02d", dateObj.getFullYear(),
					       dateObj.getMonth() + 1,
					       dateObj.getDate());
				//console.log(i, feed[i], date);
			}
			if (i === 'enclosures') {
				//console.log(i, feed[i][0]['url']);
				//console.log(date + ' - ' + title + '.mp3');

				var input = feedFolder + date + ' - ' + title + '.m3u';
				var output = feed[i][0]['url'];

				createFile(input, output, function(err) {
					if (err) {
						console.error(err);
						console.error("The file [" + output + "] could not be saved :(");
						return;
					}

					//console.log("The file [" + output + "] was saved :)");
				});
				//				downloadFile(input, output, function(error) {
				//					console.log(error);
				//				});
			}
		}
	}

	function downloadFile(url, dest, callback) {
		//console.log('=> download:', url, dest);

		var file = fs.createWriteStream(dest);
		http.get(url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				// close() is async, call callback after close completes.
				file.close(callback);
			});
			file.on('error', function(err) {
				// Delete the file async. (But we don't check the result)
				fs.unlink(dest);
				if (typeof callback === 'function') {
					callback(err.message);
				}
			});
		});
	}

	function createFile(url, dest, callback) {
		fs.writeFile(url, dest, callback);
	}

	function mkdirSync(path) {
		try {
			fs.mkdirSync(path);
		} catch (error) {
			if (error.code !== 'EEXIST') {
				throw error;
			}
		}
	}

}

try {
	// console.log(podcasts_fetcher.rss_feeds);
	
	for (var i = 0; i < config.rss_feeds.length; i++) {
		run(config.rss_feeds[i]);
	}
}
catch (error) {
	console.error('Error: ', error);
}
