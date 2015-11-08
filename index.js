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
	var feedMeta = {title: "", author: ""};
	var podcasts = [];

	request.on('error', function(error) {
		console.error("request error:", error);
	});

	request.on('response', function(res) {
		if (res.statusCode !== 200) {
			return this.emit('error', new Error('Bad status code'));
		}
		this.pipe(feedparser);
	});

	feedparser.on('error', function(error) {
		console.error('feedparser error:', error);
	});

	feedparser.on('meta', function(meta) {
		feedMeta = meta;
		feedFolder = config.download_folder + '/' + feedMeta.author + '/' + feedMeta.title + '/';
	});

	feedparser.on('readable', function() {
		var item;
		while (item = this.read()) {
			podcasts.push(parseItem(item));
		}
	});

	feedparser.on('end', function() {
		mkdirSync(config.download_folder);
		mkdirSync(config.download_folder + '/' + feedMeta.author);
		mkdirSync(feedFolder);

		console.log(String(podcasts.length).cyan + ' podcasts have been downloaded to '.yellow + feedFolder.cyan + ' folder'.yellow);
		
		// saving playlist of all feed podcast
		savePodcastPlaylist(config.download_folder + '/' + feedMeta.author + '/' + feedMeta.title + '.m3u',
				    podcasts.map(function(elem){
					    return '#EXTINF:,' + elem.title + '\n' +  elem.url_m;
				    }).join("\n"));;
		processNextPodcast();
	});

	function processNextPodcast() {
		var podcast = podcasts.shift();

		if (typeof podcast === 'undefined') {
			return;
		}
		savePodcastPlaylist(podcast.playlist, podcast.url_m);
		if (config.media_download === true && podcast.length <= config.max_media_download_size) {
			savePodcastMedia(podcast, processNextPodcast);
		}
		else {
			processNextPodcast();
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
			"length": parseInt(item.enclosures[0].length),
			"url_m": item.enclosures[0].url,
			"url": item.guid,
			"playlist": feedFolder + date + '-' + title + '.m3u',
			"file": feedFolder + date + '-' + title + '.mp3'
		};
		return podcast;
	}

	function savePodcastPlaylist(file, playlist) {
		fs.writeFile(file, '#EXTM3U\n' + playlist, function(error) {
			if (error) {
				console.error("The file [" + file + "] could not be saved :", error);
			}
		});
	}

	function savePodcastMedia(podcast, callback) {
		var file = fs.createWriteStream(podcast.file);
		var start_date = Date.now();
		http.get(podcast.url, function(response) {
			response.pipe(file);
			file.on('finish', function() {
				var download_time = (Date.now() - start_date) / 1000; // in seconds
				var download_speed = podcast.length / 1000000 / download_time; // download speed in MByte/sec
				console.log('Downloaded', podcast.length, 'Bytes in', download_time, 'seconds (', download_speed, 'MB/s)');
				file.close(callback);			
			});
			file.on('error', function(err) {
				fs.unlink(podcast.file);
				if (typeof callback === 'function') {
					callback(err.message);
				}
			});
		});
	}
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

try {
	// browsing feeds from configuration file
	for (var i = 0; i < config.rss_feeds.length; i++) {
		run(config.rss_feeds[i]);
	}

}
catch (error) {
	console.error('Error: ', error);
}
