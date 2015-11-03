var Request = require('request');
var FeedParser = require('feedparser');
var fs = require('fs');
var http = require('http');
var colors = require('colors');
var sprintf = require('sprintf-js').sprintf;

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
		console.error('error:', error);
	});

	feedparser.on('meta', function(meta) {
		feedFolder = config.download_folder + '/' + meta.author + '/' + meta.title + '/';
		//console.log('Creating folder:', feedFolder);

		mkdirSync(config.download_folder);
		mkdirSync(config.download_folder + '/' + meta.author);
		mkdirSync(feedFolder);
	});

	feedparser.on('readable', function() {

		var stream = this;
		var meta = this.meta;
		var item;

		while (item = stream.read()) {
			parseItem(item);
			cptEntries++;
		}
	});

	feedparser.on('end', function() {
		console.log(String(cptEntries).cyan + ' podcasts have been downloaded to '.yellow + feedFolder.cyan + ' folder'.yellow);
	});

	function parseItem(item) {
		// \u00E0-\u00FC means to keep the accents :)
		var title = item['title'].replace(/[^a-zA-Z- 0-9.\u00E0-\u00FC]/gi, '');;

		var dateObj = new Date(item['pubDate']);
		var media_date = sprintf('%d-%02d-%02d',
					dateObj.getFullYear(),
					dateObj.getMonth() + 1,
					dateObj.getDate());

		var media_length = parseInt(item['enclosures'][0]['length']);
		var media_url_m = item['enclosures'][0]['url'];
		var media_url = item['guid'];

		// for remote listening
		var playlist_file = feedFolder + media_date + '-' + title + '.m3u';
		// for offline listening
		/// \todo get extension from original file name
		var media_file = feedFolder + media_date + '-' + title + '.mp3';

		// saving playlist file
		createFile(playlist_file, media_url_m, function(err) {
			if (err) {
				console.error(err);
				console.error("The file [" + playlist_file + "] could not be saved :(");
				return;
			}
			//console.log("The file [" + output + "] was saved :)");
		});

		// downloading media file
		if (config.media_download && media_length <= config.max_media_download_size) {
			downloadFile(media_url, media_file);
		}

		console.log(media_url, media_file, media_length);
	}

	function downloadFile(url, dest, callback) {
		console.log('=> downloading:', url, dest);
		var file = fs.createWriteStream(dest);
		http.get(url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				file.close(callback);
				console.log('=> ok');
			});
			file.on('error', function(err) {
				fs.unlink(dest);
				if (typeof callback === 'function') {
					callback(err.message);
				}
			});
		});
	}

	function createFile(file_name, content, callback) {
		fs.writeFile(file_name, content, callback);
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
	// browsing feeds from configuration file
	for (var i = 0; i < config.rss_feeds.length; i++) {
		run(config.rss_feeds[i]);
	}
}
catch (error) {
	console.error('Error: ', error);
}
