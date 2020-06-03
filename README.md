# mqtt-relay

This is a simple relay application that passes data from MQTT to HTTP and vice versa.

It runs a light-weight Express server with a single HTTP route - `publish` - that converts the payload to an MQTT publish event and sends it to the broker.

It also subscribes to any specified MQTT topics and, if a message arrives from the broker, it converts it to an HTTP POST message and sends it to a configured destination via a `message` endpoint.

Most of the behavior of the relay is driven by environment variables.

## Environment variable settings

All of these environment variables can be found in the .env.example file. Simply rename the file to .env for your local environment to pick them up.

| Variable Name | Description | Example Value(s) |
|---------------|-------------|------------------|
| MQTT_PROTOCOL | The protocol used to connect to the MQTT broker | mqtt, mqtts |
| MQTT_HOSTNAME | The hostname or IP of the MQTT broker | wigwam.cloudmqtt.com |
| MQTT_PORT | The port of the MQTT broker | 15821 |
| AUTH | The authentication method to connect to the MQTT broker | basic, cert |
| USERNAME | If AUTH = "basic", the username to connect to the MQTT broker as | admin |
| PASSWORD | If AUTH = "basic", the password to connect to the MQTT broker with | hunter2 |
| SUBSCRIBE_TO | A comma-separated list of MQTT topics to subscribe to | example/alpha, bedroom/thermostat |
| HTTP_PROTOCOL | The protocol used to connect to the HTTP destination | http, https |
| HTTP_HOSTNAME | The hostname or IP of the HTTP destination | 214.188.255.0 |
| HTTP_PORT | The port of the HTTP destination | 80 |
| PORT | The port that the HTTP listener starts up on | 1337 |

_Note that if the relay is deployed on Heroku, the PORT environment variable will be supplied by the Heroku dyno._
