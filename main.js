const path = require("path");
const express = require("express");
const stripe = require("stripe")(process.env.APIKey);
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongouri = process.env.mongooseURI;

// Use body-parser to retrieve the raw body as a buffer
const bodyParser = require("body-parser");
const endpointSecret = process.env.webhooksecret;

const app = express();
app.use(express.static("public"));

//Adding the "add customer" function is unecessary as it is handled on the Heroku server

function createSubscription(obj) {
    const customer = obj.customer;
    const plan = obj.plan;

    //$5 = tier 1, $10 = tier 2, etc...CHANGE IF ANY VARIEATIONS ARE ADDED!!!
    const tier = plan.amount / 500;
    // if (tier != 1 && tier % 2 != 0) { throw `INCORRECT TIER (${tier}) from $${plan.amount}` }; //WRONG

    const client = new MongoClient(mongouri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

    client.connect(async (err) => {
      const d = new Date();
      const startDateUTC = `${d.getUTCDay()}|${d.getUTCMonth()}|${d.getUTCFullYear()}`;
      const dbo = client.db("main").collection("authorized");
      dbo.updateOne({ stripeID: customer }, { $set: { startDateUTC: startDateUTC, paid: true, tier: tier } });
    });
}


function deleteSubscription(obj) {
    const client = new MongoClient(mongouri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverApi: ServerApiVersion.v1,
    });

    client.connect(async (err) => {
      const customer = obj.customer;
      const dbo = client.db("main").collection("authorized");
      dbo.updateOne({ stripeID: customer }, { $set: { startDateUTC: null, paid: false, tier: 0 } });
    });
}


function changeSubscription(obj) {
  const upStates = ['trialing', 'active'];
  const downStates = ['incomplete', 'incomplete_expired', 'past_due', 'canceled', 'unpaid'];
  
  const status = obj.status.trim();
  
  if (upStates.includes(status)) {
    createSubscription(obj);
  } else if (downStates.includes(status)) {
    deleteSubscription(obj);
  } else { console.log(`ERR!\nSTATE ${status} NOT IN ANY STATE LIST!`); }
}


// Match the raw body to content type application/json
app.post(
  "/webhooks",
  bodyParser.raw({ type: "application/json" }), (request, response) => {
    const sig = request.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
      response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
        createSubscription(event.data.object, true);

        break;
      case "customer.subscription.updated":
        // changeSubscription(event.data.object);
        // console.log("Implement later (changing tiers, etc)");
        changeSubscription(event.data.object);

        break;
      case "customer.subscription.deleted":
        deleteSubscription(event.data.object, false);

        break;
      // ... handle other event types
      default:
        // Unexpected event type
        return response.status(400).end();
    }

    // Return a response to acknowledge receipt of the event
    response.json({ received: true });
  }
);

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
