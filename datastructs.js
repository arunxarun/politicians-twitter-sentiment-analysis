var async = require("async");
var mongoose = require('mongoose');
// var mongo_host = process.env.MONGO_HOST;
// var mongo_port = process.env.MONGO_PORT;
// var mongo_db = process.env.MONGO_DB;

// var conn_str = "mongodb://"+mongo_host+":"+mongo_port+"/"+mongo_db;
// mongoose.connect(conn_str);


module.exports = function(models) {

  var PoliticianSentiment = models.PoliticianSentiment;
  var PoliticianArticleCollection = models.PoliticianArticleCollection;
  var Article = models.Article;
  var Concept = models.Concept;
  var candidateSentiments = {};


  function internalBuildCandidateSentimentList(candidateData,callbackForListProcessing) {

    if(Object.keys(candidateData).length != 0) {


      async.forEachOf(candidateData,function(value, key, callback) {
        tHandle = key;
        name = value;
        PoliticianSentiment.find({twitterHandle: tHandle},null, {twitterHandle : tHandle, realName :name}, function(err, returnedCandidates){
          if(err) {
            callback(err);
          } else {
            if (returnedCandidates.length != 0) {
              candidateSentiments[returnedCandidates[0].twitterHandle] = returnedCandidates[0];
            }
            callback();
          }
        });
      },
      function(err) {
          if(err) {
            callbackForListProcessing(err);
          }
          else {
            var keys = Object.keys(candidateData);
            async.each(keys, function(key, callback) {
              if(candidateSentiments[key] == null) {
                var politicianSentiment  =  new PoliticianSentiment({
                  name: candidateData[key],
                  twitterHandle: key,
                  averages: { newAvg:0,oldAvg:0},
                  n: 0,
                  nPositive: 0,
                  nNegative: 0,
                  nNeutral: 0,
                  runningAverageWindow1: 0,
                  runningAverageWindow1Array: []
                });
                politicianSentiment.save(function (err, product, numAffected){
                  if(err) {
                    callback(err);
                  } else {
                    candidateSentiments[key] = politicianSentiment;
                    callback();
                  }
                });

              }

            }, function(err) {
              if(err) {
                callbackForListProcessing(err,null);
              } else {
                callbackForListProcessing(null,candidateSentiments);
              }
            });
          }
      });
    }
  };


  var builders = {
    buildCandidateSentimentList: internalBuildCandidateSentimentList
  }

  return builders;
}
