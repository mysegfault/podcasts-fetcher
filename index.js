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
	var feedFolder = '';
	var podcasts = [];

	request.on('error', function(error) {
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
		}
	});

	feedparser.on('end', function() {
		console.log(String(podcasts.length).cyan + ' podcasts have been downloaded to '.yellow + feedFolder.cyan + ' folder'.yellow);

		
		popAndSavePodcast();
	});

	function popAndSavePodcast()
	{
		var podcast = podcasts.pop();

		if (podcast)
		{
			console.log(podcast.title, podcast.length);
			
			// saving playlist file
			createFile(podcast.playlist, podcast.url_m, function(err) {
				if (err) {
					console.error(err);
					console.error("The file [" + podcast.playlist + "] could not be saved :(");
					return;
				}
				//console.log("The file [" + output + "] was saved :)");
			});

			if (config.media_download && podcast.length <= config.max_media_download_size) {
				// downloading media file
				// will pop the next podcast at the end of download
				downloadFile(podcast.url, podcast.file, popAndSavePodcast);
			}
			else
			{
				popAndSavePodcast();
			}
		}
		
		
	}

	function parseItem(item) {
		// \u00E0-\u00FC means to keep the accents :)
		var title = item['title'].replace(/[^a-zA-Z- 0-9.\u00E0-\u00FC]/gi, '');
		var dateObj = new Date(item['pubDate']);
		var date = sprintf('%d-%02d-%02d',
					dateObj.getFullYear(),
					dateObj.getMonth() + 1,
					dateObj.getDate());

		var podcast = {
			"title": title,
			"date": date,
			"length": parseInt(item['enclosures'][0]['length']),
			"url_m": item['enclosures'][0]['url'],
			"url": item['guid'],
			"playlist": feedFolder + date + '-' + title + '.m3u',
			"file": feedFolder + date + '-' + title + '.mp3'
		};
		podcasts.push(podcast);
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
