require('dotenv').load();

var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var io = require('socket.io')(http);
var Twitter = require('twitter');
var havenondemand = require('havenondemand');
var async = require("async");
var RateLimiter = require('limiter').RateLimiter;
var mongoose = require('mongoose');

// TODO: convert this part to use MONGO details from VCAP_SERVICES
var mongo_host = process.env.MONGO_HOST;
var mongo_port = process.env.MONGO_PORT;
var mongo_db = process.env.MONGO_DB;

mongoose.connect("mongodb://192.168.99.100:27017/db2");
var models = require('./model.js')(mongoose);

var PoliticianSentiment = models.PoliticianSentiment;
var PoliticianArticleCollection = models.PoliticianArticleCollection;
var Article = models.Article;
var Concept = models.Concept;

var datastructs  = require('./datastructs.js')(models);
var buildCandidateSentimentList = datastructs.buildCandidateSentimentList;


var hodClient = new havenondemand.HODClient(process.env.hpe_apikey);

var twitterClient = new Twitter({
  consumer_key: process.env.consumer_key,
  consumer_secret: process.env.consumer_secret,
  access_token_key: process.env.access_token,
  access_token_secret: process.env.access_token_secret
});

port = process.env.PORT || 5000;
var limiter = new RateLimiter(2, 'second') //first parameter is max number of calls per second

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var candidateString = "SenSanders,HillaryClinton,realDonaldTrump,tedcruz,marcorubio,RealBenCarson"
var window1 = 10;

// Data used to store and calculate sentiment for candidates
// Each key is the candidate's Twitter handle which is checked after a Tweet is streamed in so we know which candidate we're talking about
//TODO generate candidate numbers with datastruct functionaltiy. This is async.

// var candidateNumbers = {
//   "SenSanders": {
//     averages: {newAvg: 0, oldAvg: 0},
//     n: 0,
//     nPositive: 0,
//     nNegative: 0,
//     nNeutral: 0,
//     runningAverageWindow1: 0,
//     nWindow1: 0,
//     runningAverageWindow1Array: []
//   },
//   "HillaryClinton": {
//     averages: {newAvg: 0, oldAvg: 0},
//     n: 0,
//     nPositive: 0,
//     nNegative: 0,
//     nNeutral: 0,
//     runningAverageWindow1: 0,
//     nWindow1: 0,
//     runningAverageWindow1Array: []
//   },
//   "realDonaldTrump": {
//       averages: {newAvg: 0, oldAvg: 0},
//       n: 0,
//       nPositive: 0,
//       nNegative: 0,
//       nNeutral: 0,
//       runningAverageWindow1: 0,
//       nWindow1: 0,
//       runningAverageWindow1Array: []
//   },
//   "tedcruz": {
//     averages: {newAvg: 0, oldAvg: 0},
//     n: 0,
//     nPositive: 0,
//     nNegative: 0,
//     nNeutral: 0,
//     runningAverageWindow1: 0,
//     nWindow1: 0,
//     runningAverageWindow1Array: []
//   },
//   "JohnKasich": {
//     averages: {newAvg: 0, oldAvg: 0},
//     n: 0,
//     nPositive: 0,
//     nNegative: 0,
//     nNeutral: 0,
//     runningAverageWindow1: 0,
//     nWindow1: 0,
//     runningAverageWindow1Array: []
//   }
// }

var candidateData = {
  "SenSanders":"Bernie Sanders",
  "HillaryClinton":"Hillary Clinton",
  "realDonaldTrump": "Donald Trump",
  "tedcruz": "Ted Cruz",
  "JohnKasich":"John Kasich"
};

// as this is async, all calls that assume candidateNumbers need to return some kind of default no-op data.

var candidateNumbers = null;





var articleUpdateInterval = 60000*15; //15 minutes

// Object which stores the articles and concepts from these articles for each of the candidates
var candidateArticles = {
  "Bernie Sanders": {articles: [], concepts: []},
  "Hillary Clinton": {articles: [], concepts: []},
  "Donald Trump": {articles: [], concepts: []},
  "Ted Cruz": {articles: [], concepts: []},
  "John Kasich": {articles: [], concepts: []},
};

//TODO build candidateArticleList repo.

app.get("/", function(req, res) {
  res.render('index', {
    candidateArticles: candidateArticles,
    candidateConcepts: candidateArticles["Bernie Sanders"].concepts
  });
});

// Route for HTML of candidate articles
app.get("/candidatehtml", function(req, res) {
  var payload = candidateArticles
  res.status(200).send(payload)
})

// Route for mobile app HTML of candidate articles
app.get("/candidatehtml_mobile", function(req, res) {
  var payload ={candidates: [
      {
        name: "Bernie Sanders",
        articles: candidateArticles["Bernie Sanders"].articles
      },
      {
        name: "Hillary Clinton",
        articles: candidateArticles["Hillary Clinton"].articles
      },
      {
        name: "Donald Trump",
        articles: candidateArticles["Donald Trump"].articles
      },
      {
        name: "Ted Cruz",
        articles: candidateArticles["Ted Cruz"].articles
      },
      {
        name: "John Kasich",
        articles: candidateArticles["John Kasich"].articles
      },
    ]}
    res.status(200).send(payload)
})

// Route for the app explanation at the top
app.get("/whats_this", function(req, res) {
  res.status(200).sendFile(path.join(__dirname, 'views', 'whats_this.html'))
})

// Route for open source contribution explanation
app.get("/contribute", function(req, res) {
  res.status(200).sendFile(path.join(__dirname, 'views', 'contribute.html'))
})

// Route for third party developers to hit if they want the candidate sentiment data
app.get('/candidatedata', function(req, res) {
  // var payload = candidateNumbers
  // TODO: return payload as request of all collections, OR all zeros.
  var payload = {candidates: [
    {
      name: "SenSanders",
      averages: {newAvg: candidateNumbers["SenSanders"].averages.newAvg, oldAvg: candidateNumbers["SenSanders"].averages.oldAvg},
      n: candidateNumbers["SenSanders"].n,
      nPositive: candidateNumbers["SenSanders"].nPositive,
      nNegative: candidateNumbers["SenSanders"].nNegative,
      nNeutral: candidateNumbers["SenSanders"].nNeutral,
      runningAverageWindow1: candidateNumbers["SenSanders"].runningAverageWindow1,
      runningAverageWindow1Array: candidateNumbers["SenSanders"].runningAverageWindow1Array
    },
    {
      name: "HillaryClinton",
      averages: {newAvg: candidateNumbers["HillaryClinton"].averages.newAvg, oldAvg: candidateNumbers["HillaryClinton"].averages.oldAvg},
      n: candidateNumbers["HillaryClinton"].n,
      nPositive: candidateNumbers["HillaryClinton"].nPositive,
      nNegative: candidateNumbers["HillaryClinton"].nNegative,
      nNeutral: candidateNumbers["HillaryClinton"].nNeutral,
      runningAverageWindow1: candidateNumbers["HillaryClinton"].runningAverageWindow1,
      runningAverageWindow1Array: candidateNumbers["HillaryClinton"].runningAverageWindow1Array
    },
    {
      name: "realDonaldTrump",
      averages: {newAvg: candidateNumbers["realDonaldTrump"].averages.newAvg, oldAvg: candidateNumbers["realDonaldTrump"].averages.oldAvg},
      n: candidateNumbers["realDonaldTrump"].n,
      nPositive: candidateNumbers["realDonaldTrump"].nPositive,
      nNegative: candidateNumbers["realDonaldTrump"].nNegative,
      nNeutral: candidateNumbers["realDonaldTrump"].nNeutral,
      runningAverageWindow1: candidateNumbers["realDonaldTrump"].runningAverageWindow1,
      runningAverageWindow1Array: candidateNumbers["realDonaldTrump"].runningAverageWindow1Array
    },
    {
      name: "tedcruz",
      averages: {newAvg: candidateNumbers["tedcruz"].averages.newAvg, oldAvg: candidateNumbers["tedcruz"].averages.oldAvg},
      n: candidateNumbers["tedcruz"].n,
      nPositive: candidateNumbers["tedcruz"].nPositive,
      nNegative: candidateNumbers["tedcruz"].nNegative,
      nNeutral: candidateNumbers["tedcruz"].nNeutral,
      runningAverageWindow1: candidateNumbers["tedcruz"].runningAverageWindow1,
      runningAverageWindow1Array: candidateNumbers["tedcruz"].runningAverageWindow1Array
    },
    {
      name: "JohnKasich",
      averages: {newAvg: candidateNumbers["JohnKasich"].averages.newAvg, oldAvg: candidateNumbers["JohnKasich"].averages.oldAvg},
      n: candidateNumbers["JohnKasich"].n,
      nPositive: candidateNumbers["JohnKasich"].nPositive,
      nNegative: candidateNumbers["JohnKasich"].nNegative,
      nNeutral: candidateNumbers["JohnKasich"].nNeutral,
      runningAverageWindow1: candidateNumbers["JohnKasich"].runningAverageWindow1,
      runningAverageWindow1Array: candidateNumbers["JohnKasich"].runningAverageWindow1Array
    }
  ]}
  res.status(200).send(payload)
})



http.listen(port, function(){
  console.log("Listening on port: "+port);
});

//Stream Tweets
twitterClient.stream('statuses/filter', {track: candidateString}, function(stream) {
  stream.on('data', function(tweet) {
    if (tweet.entities !== undefined) {
      var userMentions = tweet.entities.user_mentions;
      for (var i=0; i<userMentions.length; i++) {
        var screenName = userMentions[i].screen_name;
        if(candidateNumbers == null) {
          buildCandidateSentimentList(candidateData,function(err,candidateSentiments){
            console.log("in callback!");
            candidateNumbers = candidateSentiments;
            if (candidateNumbers[screenName] !== undefined) {


              PoliticianSentiment.find({twitterHandle: screenName}, function(err,sentiments) {
                  if(err) {
                    console.log(err);
                  } else {
                    var sentiment = sentiments[0];
                    //twitterStream(screenName, candidateNumbers[screenName], tweet)
                    twitterStream(screenName, sentiment, tweet);
                  }
              });
            }
          });
        }
      }
    }
  });

  stream.on('disconnect', function (disconnectMessage) {
    console.log(disconnectMessage);
  });

  stream.on('error', function(error) {
    throw error;
  });
});

//Helper function to process a tweet for a particular candidate
// Accepts the candidate Twitter handle, an object of his or her sentiment data, and the tweet object returned from the Twitter Stream API
//Analyzes the sentiment, computes the average, computes the Instantaneous average (averageWindow1), maps to colors (no longer using in front end), emits all to the client through websockets and stores it in a Haven OnDemand Index
function twitterStream(candidate, candidateData, tweetObject) {
  var data = {text: tweetObject.text};
  limiter.removeTokens(1, function(err, remainingRequests) {
    console.log("Remaining requests per second: " + remainingRequests);
    hodClient.call('analyzesentiment', data, function(err, resp){
      // debugger;
      if (!err && !resp.body.error) {
        if (resp.body.aggregate !== undefined) {
          candidateData.n += 1; //increase n by one
          candidateData.nWindow1 +=1 ; //increase by one
          var sentiment = resp.body.aggregate.sentiment;
          // var score = 10.0/3.0*(resp.body.aggregate.score*100.0)+50.0; //map from -15 to 15 to 0 to 100 ... y =10/3*x+50
          // var score = 50.0*(resp.body.aggregate.score)+50.0; //map from -1.0 to 1.0 to 0 to 100 ... y =50*x+50
          var score = 100.0*(resp.body.aggregate.score)+50.0; //map from -0.5 to 0.5 to 0 to 100 ... y =50*x+50
          if (score > 50) {
            candidateData.nPositive += 1;
          } else if(score < 50) {
            candidateData.nNegative += 1;
          } else {
            candidateData.nNeutral += 1;
          }
          //perform running averages window
          candidateData.runningAverageWindow1Array.push(score);
          if (candidateData.runningAverageWindow1Array.length > window1) { //if there is enough data points in the window
            candidateData.runningAverageWindow1Array.splice(0,1);
            candidateData.runningAverageWindow1 = calculateRunningAverageWindow(candidateData.runningAverageWindow1Array, window1)
          }



          //
          candidateData.averages = calculateRunningAverage(score, candidateData.n, candidateData.averages);
          rgbInstantaneous = mapColor(score);
          rgbAverage = mapColor(candidateData.averages.newAvg);
          console.log("------------------------------");
          console.log(tweetObject.text + " | " + sentiment + " | " + score);
          //var tweetData = {candidate: candidate, tweet: tweetObject, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: candidateData.averages.newAvg, averageWindow1: candidateData.runningAverageWindow1, n: candidateData.n, nNeutral: candidateData.nNeutral, nNegative: candidateData.nNegative, nPositive: candidateData.nPositive};
          var tweetData = {candidate: candidate, tweet: tweetObject, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: candidateData.averages.newAvg, averageWindow1: candidateData.runningAverageWindow1, n: candidateData.n, nNeutral: candidateData.nNeutral, nNegative: candidateData.nNegative, nPositive: candidateData.nPositive};
          io.emit('message', tweetData);
          var data2 = {
            index: 'ourfeelingsaboutpoliticiansa',
            json: JSON.stringify({
              document: [{
                title: candidate + candidateData.n,
                content: tweetObject.text,
                candidate: candidate, tweet: tweetObject, positive: resp.body.positive, negative: resp.body.negative, aggregate: resp.body.aggregate, rgbInstantaneous: rgbInstantaneous, rgbAverage: rgbAverage, average: Article.averages.newAvg, averageWindow1: candidateData.runningAverageWindow1, n: candidateData.n, nNeutral: candidateData.nNeutral, nNegative: candidateData.nNegative, nPositive: candidateData.nPositive,
                score: score,
                date: Date.now()
              }]
            })
          }
          hodClient.call('addtotextindex', data2, function(err2, resp2, body2) {
            if (resp2) {
              if (resp2.body) {
                console.log("error adding to text index:" + JSON.stringify(data2));
                console.log(resp2.body)
              }
            }
          })
        }
      } else {
        // if (resp.body.error) {console.log(resp.body.error);}
        console.log("------------------");
        console.log("error calling HOD analyzesentiment.");
        console.log(err);
      }
    });
  });
}

// Functions for updating articles
updateCandidateArticles();
// setInterval(updateCandidateArticles(), articleUpdateInterval);

// Function to retrieve articles about each candidate. Results are stored in the object, candidateArticles, created at the top of this document
function updateCandidateArticles() {
  // Loop through each candidate and obtain articles pertaining to them from Haven OnDemand using Query Text Index API
  async.forEachOf(candidateArticles, function (value1, key1, callback1) {
    candidateArticles[key1].concepts = []; //delete the old concepts for the candidate
    var data1 = {text: key1, indexes: ['news_eng'], summary: 'quick', total_results: 'false'};
    hodClient.call('querytextindex', data1, function(err1, resp1) {
      if (!err1 && !resp1.body.error) {
        console.log(resp1.body.documents);
        var articles = resp1.body.documents;
        candidateArticles[key1].articles = articles;
        // Loop through each article and obtain the HTML and concepts from Haven OnDemand using View Document API and Extract Concepts API
        async.each(articles, function (article, callback2) {
          console.log(article)
          var data2 = {url: article.reference};
          hodClient.call('viewdocument', data2, function(err3, resp3) {
            var articleIndex = candidateArticles[key1].articles.indexOf(article);
            if (!err3 && !resp3.body.error && articleIndex >= 0) {
              // add real html content
              var html = resp3.body;
              candidateArticles[key1].articles[articleIndex].html = html
              console.log("worked")
            }
          });
          hodClient.call('extractconcepts', data2, function(err2, resp2) {
            var concepts = resp2.body.concepts;
            async.each(concepts, function(concept, callback) {
              var newDict = {"text": concept.concept, "size": concept.occurrences}
              candidateArticles[key1].concepts.push(newDict);
            }, function (err) {
              if (err) console.error(err.message);
            });
          });
        }, function (err) {
          if (err) console.error(err.message);
        });
      } else {
        console.log("------------------");
        console.log("error trying to analyze "+JSON.stringify(data));
        if (resp1.body.error) {console.log(resp1.body.error);}
        console.log(err1);
      }
    });
  }, function (err) {
      if (err) console.error(err.message);
  });
}

// For debugging
// setInterval(function(){debugger;}, 6000);

// Function for mapping the color of the sentiment (no longer usingin front-end)
// Accepts the sentiment score
function mapColor(score) {
  weight = Math.floor(((0.5*score + 0.5)*100));
  r = Math.floor( (255 * (100 - weight)) / 100 );
  g = Math.floor( (255 * weight) / 100 );
  b = 0;
  return {r: r, g: g, b:b};
}

// Function for finding the daily average sentiment
// Accepts the new score, the number of total tweets, and the an object of the previous average and the new average
function calculateRunningAverage(score, n, averages) {
  averages.newAvg = averages.oldAvg * (n-1)/n + score/n;   // New average = old average * (n-1)/n + new value /n
  averages.oldAvg = averages.newAvg; //set equal to new average for next go around of calling this function
  return averages;
}

// Function for calculating the instantaneous average sentiment
// Accepts the array of sentiments and the window used for calculate (i.e. look at most recent 10 tweets)
function calculateRunningAverageWindow(array, win) {
  var runsum = 0.0;
  for (var i=0; i<win; i++) {
    runsum += array[i];
  }
  var avg = runsum/win;
  return avg;
}
