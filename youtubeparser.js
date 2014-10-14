var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var request = require('request');
var youtubeRegex = new RegExp("(?:http|https|)(?::\/\/|)(?:www.|)(?:youtu\\.be\/|youtube\\.com(?:\/embed\/|\/v\/|\/watch\\?v=|\/ytscreeningroom\\?v=|\/feeds\/api\/videos\/|\/user\\S*[^\\w\\-\\s]|\\S*[^\\w\-\\s]))([\\w\\-]{11})[a-z0-9;:@#?&%=+\/\$_.-]*", 'i');
var youtubePrefix = "https://www.youtube.com/watch?v=";

/*var http = require('http');
var DelayedStream = require('delayed-stream');*/


function youtubeParser (butler, song, done) {
    var parts = song.url.match(youtubeRegex);
    if (parts) {
        var id = parts[1];
        var yUrl = youtubePrefix + id;
        var location = "./cache/";
        var filename = location + id + ".mp3";
        // Gets the video title from youtube if needed
        if (!song.title) {
            var req = request({
                method: 'GET',
                uri: "http://gdata.youtube.com/feeds/api/videos/" + id + "?v=2&alt=jsonc"
            }, function (error, response, body) {
                if (!error) {
                    body = JSON.parse(body);
                    song.album = song.album || "from Youtube";
                    if (body.data.title)
                        song.title = body.data.title;
                }
                if (fs.existsSync(filename)) {
                    song.url = filename;
                    return done(song);
                }
                butler.notify("message", {message: "Youtube song detected, processing..."});
                var youtubeDl = spawn('youtube-dl', ["--extract-audio", "--audio-format", "mp3", yUrl, "-o", filename]);
                youtubeDl.on('error', function (err) {
                    console.log(err);
                    return done(false);
                });
                youtubeDl.on("exit", function (code) {
                    song.url = filename;
                    return done(song);
                });
            });
        }
    } else {
        return done(false);
    }
}

/**
 * Need some work, but could be great
 */
/*function youtubeParser (input, done) {
    var parts = input.match(youtubeRegex);
    if (parts) {
        var id = parts[1];
        var yUrl = youtubePrefix + id;
        exec('youtube-dl --simulate --get-url ' + yUrl, function (err, stdout, stdin) {
            var url = stdout.toString();
            url = url.substring(0, url.length - 1);
            var avconv = spawn('avconv', ["-i", "pipe:0", "-acodec", "libmp3lame", '-f', 'mp3', 'pipe:1']);
            var req = request({
                url: url,
                headers: {'Youtubedl-no-compression': 'True'}
            });
            req.pipe(avconv.stdin);
            var ds = DelayedStream.create(avconv.stdout);
            var server = http.createServer(function (req, res) {
                ds.pipe(res);
            });

            server.listen(6475);
            return done("http://localhost:6475/");
        });
    } else {
        return done(false);
    }
}*/

function test (song, done) {
    return done(youtubeRegex.test(song.url));
}

module.exports = function (butler, done) {

    var avconv = spawn("avconv", []);
    avconv.on("error", function (err) {
        if (err.code === "ENOENT") {
            done(null);
        }
    });

    var ytdl = spawn("youtube-dl", ["--version"]);
    ytdl.on("error", function (err) {
        if (err.code === "ENOENT") {
            done(null);
        }
    });

    butler.parsers.push({
        order: 98,
        check: test,
        func: youtubeParser.bind(null, butler),
        type: "Youtube"});

    done({name: "Youtube parser"});
}
