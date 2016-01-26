# Quizbot
Quizbot is a chatbot for Facebook that sends multiple-choice questions for a Quizlet set. Built on Node.js with [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api).

## Demo
Quizbot is currently hosted on Heroku.

1. Login to [Facebook](http://facebook.com).

2. Message [Bernie Fernman](https://www.facebook.com/bernie.fernman), the Facebook account currently used as the bot:
`/startquiz https://quizlet.com/570764/us-capitals-flash-cards/`

## Commands
`/startquiz url`
Starts a quiz, where `url` is the url to a Quizlet set

`/endquiz`
Ends the current quiz

`/score`
Gets current score if a quiz is in progress

## Self-hosting
If run on a local server, a path to a local json file can be used instead of a Quizlet url, like `/startquiz sat-words.json`.
The json file should be an array of objects with "term" and "definition" keys like so:

    [
        {
            "term": "",
            "definition": ""
        },
        {
            "term": "",
            "definition": ""
        }
    ]

Otherwise, acquire a Client ID for the [Quizlet API](https://quizlet.com/api/2.0/docs).
