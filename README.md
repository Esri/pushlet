# Pushlet

A simple HTTP wrapper around the Apple Push Notification Service and Google Cloud Messaging Service

## Installing

1. Install Node.js (0.10.x, not 0.11.x)
2. Install Redis
3. Clone Source
4. Run `npm install`
5. Run Pushlet

    $ node pushlet.js

Configuration lives in `config.json`, it is advised that you run as a non-privileged user.

## API Endpoints

### Apple Push Notification

`POST /message/apn`

* appId - required - A unique identifier for this application. Most likely maps to the primary key or unique ID of the application in the client.
* deviceId - required - The APNS token for the device
* mode - required - sandbox or production, corresponding to which Apple server to connect to
* cert - optional - If no cert is provided, will use an existing cert for the given appId. If no existing cert is loaded, will return an error.
* key - optional - The private key for the given cert.
* notification - required
  * alert - optional - String or Object - Text to display in the push notification. (is actually sent in the APNS payload as aps.alert)
    * If alert is an object, you can specify the other properties of the notification payload under the alert object. See the [Apple docs](https://developer.apple.com/library/ios/documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Chapters/ApplePushService.html#//apple_ref/doc/uid/TP40008194-CH100-SW1)
  * badge - optional - The badge number to display on the app icon.  (is actually sent as aps.badge)
  * sound - optional - Sound file to play for the push notification.  (is actually sent as aps.sound)
  * content-available - optional - Send "1" to indicate new content is available (is actually sent as aps.content-available)
  * other properties - optional - Any other properties are also sent in the APNS payload
* timeout - optional (default 1000 ms) - Since Apple does not send an acknowledgement packet on successful delivery of a notification, wait this long for an error message, and if no error is received, assumes it was successful. Set to lower values or 0 if you do not care about confirming whether the message was sent successfully.

```
{
  appId: "com.example.iphone",
  deviceId: "809f1d3237cd219c1c672bb141f6e18513fd86a073479ef295fd0e1687270853",
  mode: "production",
  notification: {
    alert: "The quick brown fox jumps over the lazy dog"
  }
}
```

[Apple push notification payload documentation](http://developer.apple.com/library/ios/#documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/Introduction.html)

### Google Push Notification

`POST /message/gcm`

* appId - required - A unique identifier for this application. Most likely maps to the primary key or unique ID of the application in the client.
* deviceId - required - The GCM token for the device
* mode - required - sandbox or production. This has no meaning in GCM, but the API Key is stored scoped to this value anyway.
* notification - required - A JSON payload to deliver to the device. GCM itself does not define any known properties, must be handled by the developer.
* key - optional - The GCM API Key

```
{
  appId: "com.example.android",
  deviceId: "APA91bF-SNSVvcW-4M1hjuzOm49bn15V3Um9TrOwrdH2Otvf-Vv6M4SpZ2Z2g7FXgNvcoscJQkpt84Vjetbq7uRyzCxFil8qVTzjxGzAEV7fAqzqwULXEl96SH1_OjfKp_qK7p0XJWKrwfV3Sad6ZW1vLZEi6Mirpg",
  mode: "production",
  key:  "my key",
  notification: {
    some: "data"
  }
}
```

[GCM Getting Started](http://developer.android.com/google/gcm/gs.html)

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).


## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



[](Esri Tags: Pushlet APN APNS GCM Apple Google Android Push-Notification Notification Push)
[](Esri Language: JavaScript)
