/**
 * Created by wes on 2/20/16.
 */

var request = require('request');
var cheerio = require('cheerio');

var polls = [];

//Set up express
var port = 8000;
var express = require('express');
var app = express();
app.use(express.static('public'));
var http = require('http');
var httpServer = http.Server(app);
var io = require('socket.io')(httpServer);

io.sockets.on('connection', function(socket) {
    io.emit('polls', polls);
    console.log('New connection');
});

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

httpServer.listen(port, function () {
    console.log('Listening on *:' + port);
});

function onWakeup() {
    //Pull down polls page
    request('http://www.realclearpolitics.com/epolls/latest_polls/', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            polls = cheerioParsePolls(body);
            console.log(polls);
            console.log('========================')
        } else {
            console.log(error.message);
        }
    });
}

function cheerioParsePolls(body) {
    var $ = cheerio.load(body);
    var polls = [];
    var $table = $('#table-1');
    var $races = $table.find('tr:has(td.lp-race)');
    $races.each(function (index, el) {
        el = $(el);

        thisPoll = {
            race: el.find('td.lp-race a').text(),
            pollster: el.find('td.lp-poll a').text(),
            spread: el.find('td.lp-spread font span').text(),
            link: el.find('td.lp-poll a').attr('href'),
            date: el.parent('table').prev(':has(td.date)').find('td.date b').text()
        };

        var results = el.find('td.lp-results a').text();
        var candidates = results.split(', ');
        for (var i = 0; i < candidates.length; i++) {
            spr = candidates[i].split(' ');
            num = {
                name: spr[0],
                percent: parseInt(spr[1])
            };
            candidates[i] = num;
        }

        thisPoll.results = candidates;
        polls[index] = thisPoll;
    });
    return polls;
}

onWakeup();
//var CronJob = require('cron').CronJob;
//new CronJob('*/60 * * * * *', onWakeup, null, true, 'America/New_York');
