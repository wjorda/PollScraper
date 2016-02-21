/**
 * Created by wes on 2/20/16.
 */

var port = 8000;

var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var mysql = require('mysql');
var dateformat = require('dateformat');

var polls = [];

//Set up express
var app = express();
app.use(express.static('public'));
var httpServer = http.Server(app);
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
httpServer.listen(port, function () {
    console.log('Listening on *:' + port);
});

//Set up MySQL
var db = mysql.createConnection({
    host: 'localhost',
    user: 'pollscrape',
    password: 'pollscrape',
    database: 'pollscrape'
});
db.connect();
db.query('TRUNCATE TABLE polls');

//Set up sockets
var io = require('socket.io')(httpServer);
io.on('connection', function(socket) {
    io.to(socket.id).emit('polls', polls);
    console.log('New connection: ', socket.id);
    socket.on('sql-query', function(pass, sql, callback) {
        var db_public = mysql.createConnection({
            host     : 'localhost',
            user     : 'pollscrape_public',
            database: 'pollscrape',
            password : pass
        });
        console.log(sql);
        db_public.connect(function(err) {
            if (err) {
                callback(err, sql);
                return;
            }

            db_public.query(sql, function(err, res, fields) {
                if (err) {
                    callback(err, sql);
                    return;
                }
                console.log(res);
                callback(null, sql, res, fields);
            });
        });
    })
});


function pollIdGen(poll) {
    function isUpperCase(aCharacter)
    {
        return (aCharacter >= 'A') && (aCharacter <= 'Z');
    }

    function abbrevGen(sentence) {
        var abbrev = '';
        for (var i = 0, len = str.length; i < len; i++) {

        }
    }
}

function onWakeup() {
    //Pull down polls page
    request('http://www.realclearpolitics.com/epolls/latest_polls/#', function (error, response, body) {
        if (!error && response.statusCode == 200) {
            polls = cheerioParsePolls(body);
            console.log(polls);
            for(var i = 0; i < polls.length; i++)
            {
                var poll = polls[i];
                var margin = 0;
                var leader = 'Tie';
                if(poll.spread != 'Tie') {
                    var str_split = poll.spread.split(' +');
                    leader = str_split[0];
                    margin = parseInt(str_split[1]);
                }
                var marginSplit = poll.spread.split(' +');
                var sql = "INSERT IGNORE INTO polls (date, race, results, pollster, leader, margin, link) VALUES( '" +
                    dateformat(poll.date, "yyyy-mm-dd") + "', '" +
                    poll.race + "', '" + JSON.stringify(poll.results).replace("'","\\'") + "', '" +
                    poll.pollster + "', '" + leader + "', " + margin +
                    ", '" + poll.link + "');";
                //console.log(sql);
                db.query(sql, function(err, res, fields) {
                    if(err != null) {
                        console.log(err);
                    }
                    if (res != null) {
                        //console.log(res)
                    }
                    if(fields != null) {
                        //console.log(fields)
                    }
                });
            }
            console.log('========================')
        } else {
            console.log(error.message);
        }
    });
}

function cheerioParsePolls(body) {
    var $ = cheerio.load(body);
    var polls = [];
    var $table = $('#table-1').add($('#table-2').add($('#table-3')));
    var $races = $table.find('tr:has(td.lp-race)');
    var year = new Date().getFullYear();
    $races.each(function (index, el) {
        el = $(el);

        thisPoll = {
            race: el.find('td.lp-race a').text(),
            pollster: el.find('td.lp-poll a').text(),
            spread: el.find('td.lp-spread font span').text(),
            link: el.find('td.lp-poll a').attr('href'),
            date: new Date(el.parent('table').prev(':has(td.date)').find('td.date b').text() + ' ' + year)
        };

        var results = el.find('td.lp-results a').text();
        var resultsObj = {};
        var candidates = results.split(', ');
        for (var i = 0; i < candidates.length; i++) {
            spr = candidates[i].split(' ');
            var margin = spr.pop();
            resultsObj[spr.join('')] = parseInt(margin);
        }

        thisPoll.results = resultsObj;
        polls[index] = thisPoll;
    });
    return polls;
}

onWakeup();
//var CronJob = require('cron').CronJob;
//new CronJob('*/60 * * * * *', onWakeup, null, true, 'America/New_York');

app.on('close', function() {
    console.log('Good Night...');
    db.close();
});
