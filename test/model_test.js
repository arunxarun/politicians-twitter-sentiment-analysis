//var expect = chai.expect; // we are using the "expect" style of Chai
var mongoose = require('mongoose');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var assert = chai.assert;
var mongo_host = process.env.MONGO_HOST;
var mongo_port = process.env.MONGO_PORT;
var mongo_db = process.env.MONGO_DB;

mongoose.connect("mongodb://192.168.99.100:27017/db");
var models = require('../model.js')(mongoose);

var PoliticianSentiment = models.PoliticianSentiment;
var PoliticianArticleCollection = models.PoliticianArticleCollection;
var Article = models.Article;
var Concept = models.Concept;
// This agent refers to PORT where program is runninng.

PoliticianSentiment.remove({}, function(err) {
  if(err) {
    console.log(err);
  }

});

describe("candidate sentiment data",function(){
  var foundCandidate = null;
  it("should store candidate sentiment data",function(){

    var bSanders = new PoliticianSentiment({
      name: 'Bernie Sanders',
      twitterHandle: 'bsanders',
      averages: { newAvg:0,oldAvg:0},
      n: 0,
      nPositive: 0,
      nNegative: 0,
      nNeutral: 0,
      runningAverageWindow1: 0,
      runningAverageWindow1Array: []
    });

    bSanders.save();

  });

  it("should find stored candidate sentiment data",function(done) {

    PoliticianSentiment.find(function (err, candidates) {
      if (err) {
        return console.error(err);
      }
      else {


        assert(candidates[0]['name'] == 'Bernie Sanders');
        assert(candidates[0]['twitterHandle']== 'bsanders');
        assert(candidates[0]['averages']['newAvg'] == 0);
        foundCandidate = candidates[0];
        done();
      }
    });
  });

  it("should update candidate sentiment data", function done() {
    assert(foundCandidate != null);

    foundCandidate['averages']['newAvg'] = 1;
    foundCandidate['averages']['oldAvg'] = 2;
    foundCandidate['n'] = 3;

    foundCandidate.save();

    PoliticianSentiment.find(function (err2, candidates2) {
      if (err2) {
        return console.error(err2);
      } else {
        assert(candidates2 != null);
        var len = candidates2.length;
        assert(candidates2[0]['averages']['newAvg']== 1);
        assert(candidates2[0]['averages']['oldAvg']== 2);
        assert(candidates2[0]['n'] ==3);
      }
    });
  });

  it("should remove all candidate sentiment data", function done() {
    PoliticianSentiment.remove({}, function(err) {
      if(err) {

       new Promise(function(resolve, reject) {
        console.log(err);
        });
      } else {
        PoliticianSentiment.find(function (err, candidates) {
          if (err) {
            return console.error(err);
          }
          else {
            assert(candidates.length == 0);
          }
        });
        done();
      }
    });
  });
});


// var PoliticianArticle = new Schema({
//   name: String,
//   twitterHandle: String,
//   Article: [{
//     index: String,
//     links: [String],
//     reference: String,
//     summary: String,
//     title: String,
//     weight: Number
//   }],
//   concepts: [{ concept: String, occurrences: Number}]
// });

describe("candidate article data", function() {
  var foundArticle = null;
  PoliticianArticleCollection.remove({}, function(err){
    if(err) console.log(err);

  });
  it("should save candidate article data", function(){
    var bSanders = new PoliticianArticleCollection({
      name: "Bernie Sanders",
      twitterHandle: "bsanders",
      Article : [],
      concepts : []
    }
    );

    bSanders.save();
  });

  it("should find saved candidate article data",function(done){
    PoliticianArticleCollection.find({twitterHandle: "bsanders"}, function(err, Article){
      if(err){
        console.log(err);
      } else {
        console.log("found "+Article.length+ "Article");
        assert(Article.length == 1);
        assert(Article[0]['twitterHandle'] == "bsanders");
        foundArticle = Article[0];
        done();
      }
    });
  });

  it("should update candidate article data", function(done){
    assert(foundArticle != null);
    /*
    {
    //     index: String,
    //     links: [String],
    //     reference: String,
    //     summary: String,
    //     title: String,
    //     weight: Number
    //   }
     */
    article = new Article({
      index: "foo",
      links: ["foo","bar"],
      reference: "goo",
      summary: "lots of goo",
      title: "lots of foo",
      weight: 1234
    });

    concept = new Concept({
      concept : "con1",
      occurrences : 12
    });
    foundArticle.articles.set(0,article)
    foundArticle.concepts.set(0,concept);
    foundArticle.save();
    

    PoliticianArticleCollection.find({twitterHandle: 'bsanders'}, function(err, articles){
      if(err){
        console.log(err);
      } else {
        console.log("found "+articles.length+ "Article");
        assert(articles.length == 1);

        assert(articles[0]['twitterHandle'] == "bsanders");

        assert(articles[0].articles.length == 1);
        assert(articles[0].articles[0].index == 'foo');
        assert(articles[0].concepts.length == 1);
        assert(articles[0].concepts[0].concept == 'con1');

        done();
      }
    });
  });

  it("should remove all candidate article data", function(done){
    PoliticianArticleCollection.remove({}, function(err){
      if(err) console.log(err);

    });

    PoliticianArticleCollection.find({twitterHandle: "bSanders"}, function(err, Article){
      if(err){
        console.log(err);
      } else {
        assert(Article.length == 0);
        done();
      }

    });
  });
});
