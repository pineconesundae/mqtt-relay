/**
 * This is a simple relay application that passes data from MQTT to HTTP and vice versa.
 * It runs a light-weight Express server with a single HTTP route - /publish - that
 * converts the payload to an MQTT publish event and sends it to the broker.
 * It also subscribes to any specified MQTT topics and, if a message arrives from the
 * broker, it converts it to an HTTP invocation and sends it to a configured destination.
 *
 * Most of the behavior of the relay is driven by environment variables.
 */

var express = require("express");
var bodyParser = require("body-parser");
var mqtt = require("mqtt");
const axios = require("axios").default;

// Don't even bother starting up if we don't have info set for the MQTT broker
if (!process.env.MQTT_HOSTNAME || !process.env.MQTT_PORT) {
  console.log('Please define the MQTT_HOSTNAME and MQTT_PORT environment variables and try again...');
  return process.exit(1);
}

/************ HTTP Server ************/

// The port the HTTP server will listen on
const listenPort = process.env.PORT || 8080;

// Create the server and make it parse JSON
const app = express();
app.use(bodyParser.json());

// Our one and only route, which passes data to the MQTT broker
app.post('/publish', (req, res) => {
  const { topic, message } = req.body;
  console.log(`Publishing message to broker: ${JSON.stringify({ topic, message })}`);

  if (topic) {
    client.publish(topic, message, (err) => {
      if (!err) {
        res.status(200).send();
      } else {
        console.log('An unexpected error occurred when publishing an MQTT message', err);
      }
    });
  } else {
    console.log('[topic] is a required parameter!');
    res.status(400).send();
  }
});

// Start up the HTTP server on the specified port
app.listen(listenPort, () => {
  console.log(`HTTP server is online and listening on port ${listenPort}...`);
});

/************ MQTT Client ************/

// Creates an MQTT client with the specified authentication method
getClient = () => {
  if (process.env.AUTH === "basic") {
    const uri = `${process.env.MQTT_PROTOCOL || 'mqtt'}://${process.env.MQTT_HOSTNAME}:${process.env.MQTT_PORT}`
    console.log(`Connecting to ${uri}...`);

    return mqtt.connect(
      uri,
      {
        username: process.env.USERNAME,
        password: process.env.PASSWORD
      }
    );
  } else if (process.env.AUTH === "cert") {
    // TODO: Implement prod scheme with cert
    console.log("Cert-based authentication not implemented yet, ya bum!");
  } else {
    console.log("Failed to connect to broker - no authentication method set!");
  }

  return {};
};

// Get the client
var client = getClient();

/************ MQTT Client Functions ************/

// Event handler when the client connects
client.on("connect", (ack) => {
  // If we successfully got a connection...
  if (ack.returnCode === 0) {
    // If there is no session already present, subscribe to the topics
    if (!ack.sessionPresent) {
      const subscribeTo = process.env.SUBSCRIBE_TO;

      if (subscribeTo) {
        // Split the comma-separated list of topics up and trim any leading/trailing white space
        const topics = subscribeTo.split(',').map((topic) => topic.trim());

        // Loop through each topic and subscribe to it
        topics.forEach((topic) => {
          client.subscribe(topic, (err) => {
            if (err) {
              console.log(`Error when subscribing to ${topic}`, err);
            } else {
              console.log(`Subscribed to ${topic}!`);
            }
          })
        })
      } else {
        console.log('No topics to subscribe to!');
      }
    } else {
      console.log("Session is already present, skipping subscriptions...");
    }
  } else {
    console.log("Error when connecting to the MQTT broker", ack);
  }
});

// Event handler when a message is received from one of the subscriptions
client.on("message", function (topic, message) {
  console.log(`Message received from broker: ${JSON.stringify({ topic, message })}`);

  // If we have a HTTP destination configured, pass the data to it
  if (process.env.HTTP_HOSTNAME && process.env.HTTP_PORT) {
    axios.post(
      `${process.env.HTTP_PROTOCOL || 'http'}://${process.env.HTTP_HOSTNAME}:${process.env.HTTP_PORT}/message`,
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
            protocol: process.env.HTTP_PROTOCOL || 'http (default)',
            hostname: process.env.HTTP_HOSTNAME,
            port: process.env.HTTP_PORT
          },
          payload: {
            topic,
            message,
          }
        })
      );
    });
  } else {
    console.log('HTTP_HOSTNAME or HTTP_PORT environment variable is not defined!');
  }
});

client.on("reconnect", () => {
  console.log("Client is reconnecting...");
});

client.on("disconnect", () => {
  console.log("Client is disconnecting...");
});

client.on("error", (err) => {
  console.log("An unexpected error occurred", err);
});
