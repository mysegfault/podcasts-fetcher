# [podcasts-fetcher](https://github.com/mysegfault/podcasts-fetcher)
Just fetch RSS podcasts as playlist files so you can browse and listen to the various radio entries. It does not download the files, just creates files with the provided URL.

## Install dependencies
```sh
$> npm install
```

## Configure your own Podcast feeds
Edit the [configuration file](podcasts_fetcher.json) and update the "rss_feeds" entry. By default, it is configured to fetch some interesting french Radio France [France Culture](http://www.franceculture.fr) programmes :)
```json
"rss_feeds": [
		"http://radiofrance-podcast.net/podcast09/rss_10467.xml",
		"http://radiofrance-podcast.net/podcast09/rss_11701.xml"
],
```

## Create the podcasts files
```sh
$> node index.js
X podcasts have been downloaded to Podcasts/AUTHOR/TITLE/ folder
...
```

You should find the .m3u files in the "Podcasts" folder (by default)
```sh
$> ls "Podcasts/Radio France/CULTURES MONDE/"
2014-10-30 - Heureux qui comme Ulysse.m3u
...
```

# Play the podcast
Use your favorite player (vlc, XBMC...)
```sh
$> vlc "Podcasts/Radio France/CULTURES MONDE/2014-10-30 - Heureux qui comme Ulysse.m3u"
```

# MIT LICENSE
