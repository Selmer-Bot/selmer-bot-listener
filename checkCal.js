var request = require('request');
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongouri = process.env.mongooseURI;
const clientMain = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const connection = clientMain.connect();


function getDateInMin() {
  const d = new Date();
  d.setMilliseconds(0);
  d.setSeconds(0);
  return (d.getTime()).toString();
}

function checkCal() {

  try {
    connection.then(client => {
      const dbo = client.db('main').collection('reminders');

      //Get all events happening this minute
      const time = getDateInMin();

      dbo.findOne({ time: time }).then((docs) => {
        //Get All Events happening this MINUTE and put them into the following format
        if (!docs) { return; }

        var m = {};
        for (i in docs) {
          var doc = docs[i];
          if (isNaN(Number(i))) { continue; }

          //Get the time out of ms
          doc.time = (Number(time) + ((Number(doc.offset)/* + 1*/) * 60000)) / 1000;
          m[`${i}`] = doc;
        }

        var clientServerOptions = {
          uri: 'https://selmer-bot-listener.ion606.repl.co/reminders/',
          body: "",
          method: 'POST',
          headers: {
            'botcode': process.env.accesscode,
            'reminders': JSON.stringify(m)
          }
        }

        request(clientServerOptions, function(error, response) {
          // console.log(error, response.body);
          return;
        });
      });
    });

    // client.close();
  } catch (err) {
    console.error(err);
  }
}


//Make sure the app doesn't go to sleep
const express = require("express");
const app = express();

app.get('/', async (req, res) => {
  return res.sendStatus(200);
})

const listener = app.listen(process.env.PORT, () => {

  //Start at exactly the minute mark
  while (true) {
    let d = new Date();
    if (d.getSeconds() == 0) {
      break;
    }
  }

  console.log("Your app is listening on port " + listener.address().port);
  setInterval(checkCal, 60000);
});