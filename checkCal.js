var request = require('request');
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongouri = process.env.mongooseURI;

function getDateInMin() {
  const d = new Date();
  d.setMilliseconds(0);
  d.setSeconds(0);
  return (d.getTime()).toString();
}

function checkCal() {

  try {
    const client = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    client.connect(err => {
      if (err) { return console.error(err); }

      const dbo = client.db('main').collection('reminders');

      //Get all events happening this minute
      //Set up the date/time

      const time = getDateInMin();

      dbo.findOne({ time: time }).then((docs) => {
        //Get All Events happening this MINUTE and put them into the following format
        // { "0": { guildId: string, userId: string, name: string, description: string, location: string, time: string (in UTC format), offset: int (in ms) } }
        // console.log(time, docs);
        if (!docs) { return; }
        dbo.deleteOne({ time: time });
        
        var m = {};
        for (i in docs) {
          var doc = docs[i];
          if (isNaN(Number(i))) { continue; }

          //Get the time out of ms
          doc.time = time / 1000;
          m[`${i}`] = doc;
          //{ guildId: doc.guildId, userId: doc.userId, name: doc.name, description: doc.description, location: doc.location, time: time, offset: doc.offset }
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

    client.close();
  } catch (err) {
    console.error(err);
  }
}

//Start at exactly the minute mark
//????


//Make sure the app doesn't go to sleep
const express = require("express");
const app = express();

app.get('/', async (req, res) => {
  return res.sendStatus(200);
})

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
  setInterval(checkCal, 60000);
});