var Request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var http = require('http');

var RSS_URL = 'http://radiofrance-podcast.net/podcast09/rss_10467.xml';
var DOWNLOAD_FOLDER = 'Radio-France-Podcasts/';

function run() {

	mkdirSync(DOWNLOAD_FOLDER);

	var request = new Request(RSS_URL);
	var feedparser = new FeedParser([]);

	request.on('error', function(error) {
		// handle any request errors
		console.error(error);
	});

	request.on('response', function(res) {
		var stream = this;

		if (res.statusCode != 200) {
			return this.emit('error', new Error('Bad status code'));
		}

		stream.pipe(feedparser);
	});

	feedparser.on('error', function(error) {
		// always handle errors
	});

	feedparser.on('readable', function() {
		// This is where the action is!
		var stream = this;
		var meta = this.meta;
		var item;

		while (item = stream.read()) {
			parseFeed(item);
		}

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
				date = dateObj.getFullYear() + '-' + twoChars(dateObj.getMonth() + 1) + '-' + twoChars(dateObj.getDate());
				//console.log(i, feed[i], date);
			}
			if (i === 'enclosures') {
				//console.log(i, feed[i][0]['url']);
				//console.log(date + ' - ' + title + '.mp3');

				var input = DOWNLOAD_FOLDER + date + ' - ' + title + '.m3u';
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

	function twoChars(input) {
		if (input === null || typeof input === 'undefined') {
			return input;
		}
		input = input + '';

		if (input.length === 1) {
			input = '0' + input;
		}
		return input;
	}
	
	function mkdirSync(path) {
		try {
			fs.mkdirSync(path);
		} catch (error) {
			if (error.code != 'EEXIST') {
				throw error;
			}
		}
	};
}

try {
	run();
}
catch (error) {
	console.error('Error: ', error);
}
