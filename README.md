# Dozer

APN Notification Service.

## API Endpoints

### Apple Push Notification

`POST /message/apn`

* appId - required
* deviceId - required
* mode - required (sandbox or production)
* cert - optional
* key - optional
* notification - required
   * payload - required
   * payload.badge - optional
   * payload.sound - optional
   * payload.alert - optional
* timeout - optional (default 1000 ms)

```
{
  appId: "123456",
  deviceId: "abcd",
  mode: "production",
  notification: {
    alert: "The quick brown fox jumps over the lazy dog"
  }
}
```

### Google Push Notification

`POST /message/gcm`

* appId - required
* deviceId - required
* mode - required (sandbox or production)
* notification - required
* key - optional

```
{
  appId: "123456",
  deviceId: 'abcd',
  mode: "production",
  key:  "my key",
  notification: {
    some: "data"
  }
}
```