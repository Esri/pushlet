# Dozer

Push Notification Service.

## Installing

1. Install Node.js (0.10.x, not 0.11.x)
2. Install Redis
3. Clone Source
4. Run `npm install`
5. Run Dozer

    $ node index.js

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
   * payload - optional - The raw payload to send to the device. See the APNS docs for more info.
   * alert - optional - Text to display in the push notification.
   * badge - optional - The badge number to display on the app icon.
   * sound - optional - Sound file to play for the push notification.
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

[Apple push notification payload documentation](http://developer.apple.com/library/ios/#documentation/NetworkingInternet/Conceptual/RemoteNotificationsPG/ApplePushService/ApplePushService.html)

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

[](Esri Tags: Dozer APN GCM Push-Notification Notification Push)
[](Esri Language: JavaScript)