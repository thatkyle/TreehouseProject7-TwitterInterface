const pug = require('pug');
const twit = require('twit');
const apikeys = require('./config.js');
const express = require('express');
const app = express();

app.use('/static', express.static('public'));
app.set('view engine', 'pug');

const twitter = new twit({
  consumer_key:         apikeys.config.consumer_key,
  consumer_secret:      apikeys.config.consumer_secret,
  access_token:         apikeys.config.access_token,
  access_token_secret:  apikeys.config.access_token_secret
})

const defaultUserId = apikeys.config.consumer_key.slice(0,8);

// This is a Promise wrapper for twit.get() requests that accepts an array with
// the first two parameters for twit.get(), path & options, and returns a
// pending Promise for twit.get() which can be processed with .then() & .catch()
const twitPromise = twitArgs => {
  return new Promise((resolve, reject) => {
    twitter.get(...twitArgs, (err, data, response) => resolve(data));
})}

// Accepts a user_id and returns an object whose values hold request params
// [path, {options}], which can either be passed directly into twitPromise, or
// passed into twit.get as its first two parameters using the spread operator
const twitRequests = user_id => ({
  tweets: [`statuses/user_timeline`, {user_id, count: 5}],
  friends: [`friends/list`, {user_id, skip_status: true, include_user_entities: false, cursor: -1}],
  dms: [`direct_messages/events/list`, {user_id}],
  userprofile: [`/users/show`, {user_id}],
});

// Accepts a userId which is passed to twitRequests, then iterates through all
// requests in twitRequests and returns an object holding the raw responses of
// both successful and failed attempts for further processing
const getTwitRequests = async function(userId) {
  const twitsData = {};
  for (const [key, twitArgs] of Object.entries(twitRequests(userId))) {
    await twitPromise(twitArgs)
      .catch(err => {twitsData[key] = err})
      .then(data => {twitsData[key] = data})
  }
  return(twitsData);
}

app.get('/', (req, res) => {
  +async function(userId = defaultUserId) {
    let dms, tweets, friends, userprofile;
    renderData = await getTwitRequests(userId)
    if (! renderData.userprofile.errors || renderData.userprofile !== undefined) {
      userprofile = renderData.userprofile;
    }
    if (! renderData.tweets.errors || renderData.tweets !== undefined) {
      tweets = renderData.tweets;
    }
    if (! renderData.friends.errors || renderData.friends !== undefined) {
      users = renderData.friends;
    }
    if (! renderData.dms.errors || renderData.dms !== undefined) {
      dms = renderData.dms;
    }
    res.render('layout', {
      profileName: userprofile.name,
      profileScreenName: userprofile.screen_name,
      profileImageUrl: userprofile.profile_image_url,
      tweets,
      users: renderData.friends.users,
      dms
    })
  }()
})

app.listen(3000, () => console.log('Example app listening on port 3000!'));
