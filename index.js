var fbChat = require('facebook-chat-api');
var fs = require('fs');
var http = require('http');
var https = require('https');

http.createServer(function(req, res) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end('fbchatbot');
}).listen(process.env.PORT || 8000);

var USER_EMAIL = process.env.USER_EMAIL;
var USER_PASSWORD = process.env.USER_PASSWORD;
var QUIZLET_CLIENT_ID = process.env.QUIZLET_CLIENT_ID;
 
var bh = 100006427905044;
var bc = 100000556551058;
var simon = 1445476610;
var soham = 100007492601505;
var me = 100007470553567;
var choices = {};

var quiz = {
    started: false,
    threadId: me,
    set: null,
    data: '',
    index: 0,
    endIndex: 0,
    numOptions: 5,
    missedTerms: [],
    loadSet: function(url)  {
        this.set = url;
        if (url.indexOf('quizlet.com') > -1) {
            var setId = url.match(/[0-9][0-9]*/)[0];
            var that = this;
            return https.get('https://api.quizlet.com/2.0/sets/'+setId+'/terms?client_id='+QUIZLET_CLIENT_ID, function(res) {
                res.on('data', function(d) {
                    that.data += d;
                });
                return res.on('end', function() {
                    that.data = JSON.parse(that.data);
                    if (that.data.length) {
                        return that.start();
                    }
                    else {
                        return 'Error loading set. Recheck the url.';
                    }
                });
            }).on('error', function(err) {
                console.error(err);
            });
        }
        // TODO: why doesn't endsWith work
        //else if (url.endsWith('.json')) {
        else if (url.indexOf('.json') > 0) {
            // TODO: make async
            this.data = JSON.parse(fs.readFileSync(url, 'utf8'));
            if (this.data.length) {
                return this.start();
            }
            else {
                return 'Error loading set. Recheck the url.';
            }
        }
    },
    setRange: function(start, end) {
        this.index = start;
        this.endIndex = end;
        return this.endIndex - this.index;
    },
    score: function() {
        if (this.started) {
            // TODO: score is obo
            return this.index+1-this.missedTerms.length 
                + '/' + (this.index+1) + ' correct.';
        }
        else {
            return 'No quiz in progress. Start quiz with /startquiz url';
        }
    },
    start: function() {
        if (this.started) {
            return 'Quiz already in progress. End quiz with /endquiz';
        }
        else {
            this.index = 0;
            this.started = true;
            return this.data.length + ' terms';
        }
    },
    next: function() {
        if (this.index+1 < this.data.length) {
            return this.assembleItem(++this.index);
        }
        else {
            return this.end();
        }
    },
    current: function() {
        if (this.started) {
            return this.assembleItem(this.index);
        }
        else {
            return this.end();
        }
    },
    end: function() {
        if (this.started) {
            var score = this.score();
            this.started = false;
            return score + (this.missedTerms.length > 0 ? '\nTerms to study:\n' + this.missedTermsString() : '');
        }
        else {
            return 'No quiz in progress.';
        }
    },
    assembleItem: function(i) {
        var indices = [i], n;
        while (indices.length < this.numOptions + 1) {
            n = rand(0, this.data.length-1);
            if (indices.indexOf(n) < 0) {
                choices[char(65+indices.length-1)] = n;
                indices.push(n);
            }
        }
        choices['correct'] = char(65+rand(0, this.numOptions-1));
        choices[choices['correct']] = i;
        msg = (i+1) + '. ' + this.data[i]['definition'];
        for (var j=0; j<this.numOptions; j++) {
            msg += '\n' + '(' + char(65+j) + ') ' + this.data[choices[char(65+j)]]['term'];
        }
        i++;
        return msg;
    },
    missedTermsString: function() {
        var words = '';
        for (var i=0; i<this.missedTerms.length; i++) {
            words += '* ' + this.data[this.missedTerms[i]]['term'] + ' - ' + this.data[this.missedTerms[i]]['definition'] + '\n';
        }
        return words;
    }
}

fbChat({email: USER_EMAIL, password: USER_PASSWORD}, function callback (err, api) {
    if (err) return console.error(err);

    var lastMsgId = '';
    api.listen(function(err, msg) {
        if (err) return console.error(err);
        console.log(msg);
        if (msg.messageID == lastMsgId) {
            return;
        }
        else if (msg.body.charAt(0) == '/') {
            lastMsgId = msg.messageID;
            api.sendMessage(processCommand(msg.body), quiz.threadId, function(err, msgInfo) {
                if (err) return console.error(err);
                if (quiz.started)
                    api.sendMessage(quiz.current(), quiz.threadId);
            });
        }
        else if (quiz.started) {
            api.sendMessage(processResponse(msg.body), quiz.threadId, function(err, msgInfo) {
                if (err) return console.error(err);
                api.sendMessage(quiz.next(), quiz.threadId);
            });
        }
    });
});

var COMMANDS = {
    START: 'startquiz',
    END: 'endquiz',
    SCORE: 'score'
};
function processCommand(cmd) {
    var args = cmd.split(' ').slice(1);
    cmd = cmd.split(' ')[0].substring(1);
    if (cmd == COMMANDS.START) {
        if (args[0]) { // set url
            return quiz.loadSet(args[0]);
        }
        else {
            return 'No set url specified. Command should be: /startquiz url';
        }
    }
    else if (cmd == COMMANDS.END) {
        return quiz.end();
    }
    else if (cmd == COMMANDS.SCORE) {
        return quiz.score();
    }
    else {
        return 'Unrecognized command.';
    }
}

function processResponse(msg) {
    if (msg.length == 1) {
        if (msg.toLowerCase() == choices['correct'].toLowerCase()) {
            return 'Correct. (y)';
        }
        else {
            quiz.missedTerms.push(choices[choices['correct']]);
            return 'Incorrect. Correct answer is ' + choices['correct'];
        }
    }
}

// Utility functions

function char(i) {
    return String.fromCharCode(i);
}

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
    var j, temp;
    for (var i=arr.length-1; i>1; i--) {
        j = rand(0, i);
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
}
