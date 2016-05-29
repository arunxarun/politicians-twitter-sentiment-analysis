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

  var Article = new Schema({
    index: String,
    links: [String],
    reference: String,
    summary: String,
    title: String,
    weight: Number
  });

  var Concept = new Schema({
    concept: String,
    occurrences: Number
  });

  var PoliticianArticleCollection = new Schema({
    name: String,
    twitterHandle: String,
    articles: [],
    concepts: []
  });

  var models = {
    PoliticianSentiment : mongoose.model('PoliticianSentiment', PoliticianSentiment),
    Article : mongoose.model('Article',Article),
    Concept : mongoose.model('Concept',Concept),
    PoliticianArticleCollection : mongoose.model('PoliticianArticleCollection', PoliticianArticleCollection)
  };

  return models;

}
