var https = require('https');
var fs = require('fs');

var QUIZLET_CLIENT_ID = process.env.QUIZLET_CLIENT_ID;

function Quiz() {
    this.setUrl = '';
    this.set = [];
    this.index = 0;
    this.endIndex = 0;
    this.numOptions = 5;
    this.choices = {};
    this.missedTerms = [];
}

Quiz.prototype.loadSet = function(url) {
    this.setUrl = url;
    this.set = [];
    if (url.indexOf('quizlet.com') > -1) {
        var setId = url.match(/[0-9][0-9]*/)[0];
        var that = this;
        return https.get('https://api.quizlet.com/2.0/sets/'+setId+'/terms?client_id='+QUIZLET_CLIENT_ID, function(res) {
            res.on('data', function(d) {
                that.set += d;
            });
            return res.on('end', function() {
                that.set = JSON.parse(that.set);
                if (that.set.length) {
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
        this.set = JSON.parse(fs.readFileSync(url, 'utf8'));
        if (this.set.length) {
            return this.start();
        }
        else {
            return 'Error loading set. Recheck the url.';
        }
    }
}

Quiz.prototype.setRange = function(start, end) {
        this.index = start;
        this.endIndex = end;
        return this.endIndex - this.index;
}

Quiz.prototype.score = function() {
        if (this.started) {
            // TODO: score is obo in the middle of a quiz
            return this.index+1-this.missedTerms.length 
                + '/' + (this.index+1) + ' correct.';
        }
        else {
            return 'No quiz in progress. Start quiz with /startquiz url';
        }
}

Quiz.prototype.start = function() {
    if (this.started) {
        return 'Quiz already in progress. End quiz with /endquiz';
    }
    else {
        this.index = 0;
        this.started = true;
        return this.set.length + ' terms';
    }    
}

Quiz.prototype.next = function() {
    if (this.index + 1 < this.set.length) {
        return this.assembleItem(++this.index);
    }
    else {
        return this.end();
    }
}

Quiz.prototype.current = function() {
    if (this.started) {
        return this.assembleItem(this.index);
    }
    else {
        return this.end();
    }
}

Quiz.prototype.end = function() {
    if (this.started) {
        var score = this.score();
        this.started = false;
        return score + (this.missedTerms.length > 0 ? '\nTerms to study:\n' + this.missedTermsString() : '');
    }
    else {
        return 'No quiz in progress.';
    }
}

Quiz.prototype.assembleItem = function(i) {
    var indices = [i], n;
    while (indices.length < this.numOptions + 1) {
        n = rand(0, this.set.length-1);
        if (indices.indexOf(n) < 0) {
            this.choices[char(65+indices.length-1)] = n;
            indices.push(n);
        }
    }
    this.choices['correct'] = char(65+rand(0, this.numOptions-1));
    this.choices[this.choices['correct']] = i;
    msg = (i+1) + '. ' + this.set[i]['definition'];
    for (var j=0; j<this.numOptions; j++) {
        msg += '\n' + '(' + char(65+j) + ') ' + this.set[this.choices[char(65+j)]]['term'];
    }
    i++;
    return msg;
}

Quiz.prototype.missedTermsString = function() {
    var words = '';
    for (var i=0; i<this.missedTerms.length; i++) {
        words += '* ' + this.set[this.missedTerms[i]]['term'] + ' - ' + this.set[this.missedTerms[i]]['definition'] + '\n';
    }
    return words;
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

module.exports = Quiz;
