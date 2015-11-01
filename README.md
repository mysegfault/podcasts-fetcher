# [radio-france-podcast-fetcher](https://github.com/mysegfault/radio-france-podcast-fetcher)
Just fetch Radio France [France Culture](http://www.franceculture.fr) podcasts as playlist files so you can browse and listen to the various radio shows. It does not download the files, just creates files with the provided URL.

RSS feed is configured to the show "Les Nouveaux chemins de la connaissance". Just change the RSS address if you want to fetch any other show.

## Install dependencies
```sh
$> npm install
```

## Create the podcasts files
```sh
$> node index.js
```

You should find (by default) .m3u files in the "Radio-France-Podcasts" folder
```sh
$> ls Radio-France-Podcasts/
2014-10-30 - Heureux qui comme Ulysse ... 44  LUlysse des frères Coen.m3u
2014-10-31 - Actualité philosophique Deleuze les mouvements aberrants ed. de Minuit.m3u
...
```

# Play the podcast
Use your favorite player (vlc, XBMC...)
```sh
$> vlc "2014-10-30 - Heureux qui comme Ulysse ... 44  LUlysse des frères Coen.m3u"
```

# MIT LICENSE
