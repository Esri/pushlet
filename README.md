# Dozer

APN Notification Service.

## API Endpoint

`POST /message`

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