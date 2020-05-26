var http = require("http");
var mqtt = require("mqtt");
const { broker, server } = require(`../config/${process.env.NODE_ENV.toLowerCase()}`);
const axios = require("axios").default;

http
  .createServer((req, res) => {
    console.log("HTTP server is online...");
    res.end();
  })
  .listen(process.env.PORT);

getClient = (env) => {
  if (env === "development") {
    return mqtt.connect(
      `${broker.hostname}:${broker.port}`,
      {
        username: broker.username,
        password: broker.password
      }
    );
  } else if (env === "production") {
    // TODO: Implement prod scheme with cert
    console.log("Production not implemented...using development config instead!");
    return getClient("development");
  } else {
    console.log(`Failed to load config - unknown environment: ${env}`);
  }
};

var client = getClient(process.env.NODE_ENV);

client.on("connect", (ack) => {
  if (ack.returnCode === 0) {
    if (!ack.sessionPresent) {
      client.subscribe("bbox/status", (err) => {
        if (err) {
          console.log("Error when subscribing to bbox/status", err);
        } else {
          console.log("Subscribed to bbox/status!");
        }
      });

      client.subscribe("bbox/cups", (err) => {
        if (err) {
          console.log("Error when subscribing to bbox/cups", err);
        } else {
          console.log("Subscribed to bbox/cups!");
        }
      });
    } else {
      console.log("Session is already present, skipping subscriptions...");
    }
  } else {
    console.log("Error when connecting to the MQTT broker", ack);
  }
});

client.on("reconnect", () => {
  console.log("Client is reconnecting...");
});

client.on("disconnect", () => {
  console.log("Client is disconnecting...");
});

client.on("message", function (topic, message) {
  console.log(`Message received from broker: ${JSON.stringify({ topic, message })}`);

  axios.post(
    `${server.hostname}:${server.port}/message`,
    { topic, message }
  ).then((response) => {
    if (response.status >= 400) {
      console.log("The server returned an error response code when relaying the message", response);
    }
  }).catch((err) => {
    console.log(
      "An unexpected error occurred when sending an HTTP message",
      JSON.stringify({
        error: err,
        connection: {
          hostname: server.hostname,
          port: server.port
        },
        payload: {
          topic,
          message,
        }
      })
    );
  })
});

client.on("error", (err) => {
  console.log("An unexpected error occurred", err);
});
