//update for mongo

var request = require('request');
var crypto = require('crypto');
var bcrypt = require('bcrypt-nodejs');
var util = require('../lib/utility');

var db = require('../app/config');
var User = require('../app/models/user');
var Link = require('../app/models/link');
var Users = require('../app/collections/users');
var Links = require('../app/collections/links');
var Q = require('q');

exports.renderIndex = function(req, res) {
  res.render('index');
};

exports.signupUserForm = function(req, res) {
  res.render('signup');
};

exports.loginUserForm = function(req, res) {
  res.render('login');
};

exports.logoutUser = function(req, res) {
  req.session.destroy(function(){
    res.redirect('/login');
  });
};

exports.fetchLinks = function(req, res, next) {
  var findAll = Q.nbind(Link.find, Link);

  findAll({})
    .then(function (links) {
      res.json(links);
    })
    .fail(function (error) {
      next(error);
    });

};

exports.saveLink = function(req, res, next) {
  var url = req.body.url;
    if (!util.isValidUrl(url)) {
      return next(new Error('Not a valid url'));
    }

    var createLink = Q.nbind(Link.create, Link);
    var findLink = Q.nbind(Link.findOne, Link);

    findLink({url: url})
      .then(function (match) {
        if (match) {
          res.send(match);
        } else {
          return util.getUrlTitle(url);
        }
      })
      .then(function (title) {
        if (title) {
          var newLink = {
            url: url,
            visits: 0,
            base_url: req.headers.origin,
            title: title
          };
          return createLink(newLink);
        }
      })
      .then(function (createdLink) {
        if (createdLink) {
          res.json(createdLink);
        }
      })
      .fail(function (error) {
        next(error);
      });
};

exports.loginUser = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;


  var findUser = Q.nbind(User.findOne, User);
  findUser({username: username})
    .then(function(user){
      if(!user){
        next(new Error('User does not exist'));
      } else {
        return user.comparePasswords(password)
          .then(function(foundUser){
            if(foundUser){
              util.createSession(req, res, user);
            } else {
              return next(new Error('No user'));
            }
          });
      }
    })
    .fail(function(error){
      next(error);
    });
};

exports.signupUser = function(req, res) {

    var username  = req.body.username,
        password  = req.body.password,
        create,
        newUser;

    var findOne = Q.nbind(User.findOne, User);

    // check to see if user already exists
    findOne({username: username})
      .then(function(user) {
        if (user) {
          next(new Error('User already exist!'));
        } else {
          // make a new user if not one
          create = Q.nbind(User.create, User);
          newUser = {
            username: username,
            password: password
          };
          return create(newUser);
        }
      })
      .then(function (user) {

        util.createSession(req, res, newUser);
      })
      .fail(function (error) {
        next(error);
      });

};

exports.navToLink = function(req, res) {
  var findLink = Q.nbind(Link.findOne, Link);
  findLink({code: req.params[0]})
    .then(function (link) {
      if (link) {
        link.visits++;
        link.save(function (err, savedLink) {
          if (err) {
            next(err);
          } else {
            res.redirect(savedLink.url);
          }
        });
      } else {
        next(new Error('Link not added yet'));
      }
    })
    .fail(function (error) {
      next(error);
    });
};
