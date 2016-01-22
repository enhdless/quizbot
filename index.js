var fbChat = require('facebook-chat-api');
var http = require('http');
var Quiz = require('./quiz');

http.createServer(function(req, res) {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.end('fbchatbot');
}).listen(process.env.PORT || 8000);

var USER_EMAIL = process.env.USER_EMAIL;
var USER_PASSWORD = process.env.USER_PASSWORD;

var threads = {};

fbChat({email: USER_EMAIL, password: USER_PASSWORD}, {forceLogin: true}, function(err, api) {
    if (err) return console.error(err);

    var lastMsgId = '';
    api.listen(function(err, msg) {
        if (err) return console.error(err);
        console.log(msg);
        if (!threads[msg.threadID]) {
            threads[msg.threadID] = new Quiz();
        }
        if (msg.messageID == lastMsgId) { 
            return; // because links are a separate message
        }
        else if (msg.body.charAt(0) == '/') {
            lastMsgId = msg.messageID;
            api.sendMessage(processCommand(msg.body, msg.threadID), msg.threadID, function(err, msgInfo) {
                if (err) return console.error(err);
                console.log(msgInfo);
                if (threads[msg.threadID].started)
                    api.sendMessage(threads[msg.threadID].current(), msg.threadID);
            });
        }
        else if (threads[msg.threadID].started && msg.body.length == 1) {
            api.sendMessage(processResponse(msg.body, msg.threadID), msg.threadID, function(err, msgInfo) {
                if (err) return console.error(err);
                console.log(msgInfo);
                api.sendMessage(threads[msg.threadID].next(), msg.threadID);
            });
        }
    });
});

var COMMANDS = {
    START: 'startquiz',
    END: 'endquiz',
    SCORE: 'score'
};
function processCommand(cmd, threadID) {
    var args = cmd.split(' ').slice(1);
    cmd = cmd.split(' ')[0].substring(1);
    if (cmd == COMMANDS.START) {
        if (args[0]) { // set url
            return threads[threadID].loadSet(args[0]);
        }
        else {
            return 'No set url specified. Command should be: /startquiz url';
        }
    }
    else if (cmd == COMMANDS.END) {
        return threads[threadID].end();
    }
    else if (cmd == COMMANDS.SCORE) {
        return threads[threadID].score();
    }
    else {
        return 'Unrecognized command.';
    }
}

function processResponse(msg, threadID) {
    if (msg.toLowerCase() == threads[threadID].choices['correct'].toLowerCase()) {
        return 'Correct. (y)';
    }
    else {
        threads[threadID].missedTerms.push(threads[threadID].choices[threads[threadID].choices['correct']]);
        return 'Incorrect. Correct answer is ' + threads[threadID].choices['correct'];
    }
}
