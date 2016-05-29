//var expect = chai.expect; // we are using the "expect" style of Chai
var mongoose = require('mongoose');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should;
var assert = chai.assert;

mongoose.connect("mongodb://192.168.99.100:27017/db");
var models = require('../model.js')(mongoose);

var PoliticianSentimentSchema = models.PoliticianSentimentSchema;
var CandidateArticles = models.CandidateArticles;

// This agent refers to PORT where program is runninng.

models.PoliticianSentiments.remove({}, function(err) {
  if(err) {
    console.log(err);
  }

});

describe("candidate sentiment data",function(){
  var foundCandidate = null;
  it("should store candidate sentiment data",function(){
    
    var bSanders = new models.PoliticianSentiments({
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

  it("should find stored candidate data",function(done) {

    models.PoliticianSentiments.find(function (err, candidates) {
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

  it("should update candidate data", function done() {
    assert(foundCandidate != null);

    foundCandidate['averages']['newAvg'] = 1;
    foundCandidate['averages']['oldAvg'] = 2;
    foundCandidate['n'] = 3;

    foundCandidate.save();

    models.PoliticianSentiments.find(function (err2, candidates2) {
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

  it("should remove all candidate data", function done() {
    models.PoliticianSentiments.remove({}, function(err) {
      if(err) {

       new Promise(function(resolve, reject) {
        console.log(err);
        });
      } else {

      }
      done();
    });
  });

});

// title: { type: String }
// , rating: String
// , releaseYear: Number
// , hasCreditCookie: Boolean

// var assert = require('chai').assert;
// describe('Array', function() {
//   describe('#indexOf()', function () {
//     it('should return -1 when the value is not present', function () {
//       assert.equal(-1, [1,2,3].indexOf(5));
//       assert.equal(-1, [1,2,3].indexOf(0));
//     });
//   });
// });
