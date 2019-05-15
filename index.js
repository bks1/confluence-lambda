const fs   = require("fs");
const path = require("path");

const AWS = require("aws-sdk");

const ejs           = require("ejs");
const async         = require("async");
const ConfluenceApi = require("confluence-api");

const s3  = new AWS.S3();
const ssm = new AWS.SSM();

// SSM parameter names to get credentials from
const confluenceUsernameParameter = "...";
const confluencePasswordParameter = "...";

// Base URL for the confluence site
const confluenceUrl = "https://...";

function getCrendtials(callback) {
  async.reduce([
    { key: confluenceUsernameParameter, name: "username" },
    { key: confluencePasswordParameter, name: "password" }
  ], {}, (result, key, cb) => {
    console.log(`Getting SSM parameter ${key.key}`);
    ssm.getParameter({
      Name: key.key,
      WithDecryption: true
    }, (err, data) => {
      if (err) { console.error(err); cb(err); }
      else { result[key.name] = data.Parameter.Value; cb(null, result); }
    });
  }, callback);
}

function updateConfluencePage(credentials, callback) {

  let confluence = new ConfluenceApi({
    username: credentials.username,
    password: credentials.password,
    baseUrl:  confluenceUrl,
  });

  // GET the page for the version # of page & embded version
  confluence.getContentById(pageId, (err, page) => {
    if (err) {
      console.error(err);
      callback(err);
      return;
    }

    let content = generateConfluence();

    // Update the page with the new version
    confluence.putContent(
      pageSpace, pageId, page.version.number + 1,
      page.title, content, (err, _res) => {
        if (err) { console.error(err); callback(err); }
        else {
          console.log("Successfully updated confluence accounts list");
          callback();
        }
      }, false);
  });
}

function generateConfluence () {
  const confluenceTemplate = fs.readFileSync(path.join(__dirname, "page.ejs")).toString();
  const template = ejs.compile(confluenceTemplate);

  // Data to pass to confluence template
  let data = {
    // TODO: create data
    hello: "World"
  };


  return template(data);
};

/// ------ ejs helpers ------

exports.handler = (_event, _context, callback) => {
  getCrendtials((err, credentials) => {
    if (err) { callback(err); }
    else updateConfluencePage(credentials, accounts, callback);
  });
}
