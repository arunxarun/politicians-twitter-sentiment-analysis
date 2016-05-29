var mongoose = require('mongoose');
var Schema = mongoose.Schema;


module.exports = function(mongoose){

  var PoliticianSentiment = new Schema({
    name: String,
    twitterHandle: String,
    averages: { newAvg: Number, oldAvg: Number},
    n: Number,
    nPositive: Number,
    nNegative: Number,
    nNeutral: Number,
    runningAverageWindow1: Number,
    runningAverageWindow1Array: [Number]
  });

  var PoliticianArticle = new Schema({
    articles: [{
      index: String,
      links: [String],
      reference: String,
      summary: String,
      title: String,
      weight: Number
    }],
    concepts: [{ concept: String, occurrences: Number}]
  });

  var models = {
    PoliticianSentiments : mongoose.model('PoliticianSentiments', PoliticianSentiment),
    PoliticianArticles : mongoose.model('PoliticianArticles', PoliticianArticle)
  };

  return models;

}
