## Run Dozer

In one terminal window, run dozer:

```
node index.js
```


## Set up the Certificates

Export your push certificate from your keychain as a .p12 file. See our [Setting Up Push Notifications](http://esri.github.io/geotrigger-docs/ios/push-notifications/#export-the-push-certificate) guide for full instructions on how to get the .p12 file.

Once you have Certificates.p12 in this folder, you'll need to generate the key and certificate files from it.

```
# Generate the pem file. This will ask you for a password which you can remove in the next step.
openssl pkcs12 -in Certificates.p12 -nocerts -out key-private.pem

# Remove the password from the key.
openssl rsa -in key-private.pem -out key.pem

# Delete the password-protected version
rm key-private.pem

# Export the certificate
openssl pkcs12 -in Certificates.p12 -nokeys -out cert.pem
```

Now you should have two files, `key.pem` and `cert.pem`. 

If one of the steps failed, most likely the Certificates.p12 file only contained the certificate and is missing the private key. Make sure you can see the private key in the Keychain app like in this screenshot: [geotrigger-docs/ios/push-notifications](http://esri.github.io/geotrigger-docs/ios/push-notifications/#export-the-push-certificate).


## Test the Connection

```
openssl s_client -connect gateway.sandbox.push.apple.com:2195 -cert cert.pem -key key.pem
```

Or, if it's a production cert,

```
openssl s_client -connect gateway.push.apple.com:2195 -cert cert.pem -key key.pem
```

If all goes well, you should eventually see "SSL handshake has read 2731 bytes and written 2177 bytes" and something like this at the end:

```
---
New, TLSv1/SSLv3, Cipher is AES256-SHA
Server public key is 2048 bit
Secure Renegotiation IS supported
Compression: NONE
Expansion: NONE
SSL-Session:
    Protocol  : TLSv1
    Cipher    : AES256-SHA
    Session-ID: 
    Session-ID-ctx: 
    Master-Key: E7EB96C9F42D28D90D1FB7246FBFB5FE9250CC13C5C48B63529A08CEF9A04E53D943AB5A77083D2CADE20189C43E4418
    Key-Arg   : None
    Start Time: 1368227902
    Timeout   : 300 (sec)
    Verify return code: 0 (ok)
---
```

and the connection should stay open.

If there is a problem, the output will end in 

```
closed
```

and the program will end. If you do this step, you can often find problems with the certificate much easier than after you try to send a push notification through dozer directly.


## Send a test push

After you have the dozer server running, run this command to send a push notification through it.

```
node push.js --cert=cert.pem --key=key.pem --mode=sandbox --message="Testing pushies" --timeout=5000
```

If everything goes well, you should see this response

```
{
  "response": "ok"
}
```


## Troubleshooting

There are a number of things that can go wrong when trying to send a push notification. The most common are problems with the certificate.

### Using the wrong certificate

If you generated a certificate for the sandbox APNS environment, it will not work on the production servers. You will see an error almost immediately after trying to send a push notification.

```
{
  "response": "error",
  "error": "disconnected",
  "error_description": "APNS disconnected the socket! Most likely this is due to a bad or expired certificate, or trying to use a sandbox certificate on the production APNS servers."
}
```

### Invalid, Expired or Revoked Certificate

It is possible that your certificate is expired or revoked. In this case you will also be immediately disconnected upon trying to connect. The error will be the same as above.

### Invalid Device Token

If you are sending to a device token that is not registered with your application, or if there is something else wrong with the token, you will get this error response:

```
{
  "response": "error",
  "error": "transmissionError",
  "error_description": "Invalid Token"
}
```

Common causes of this error are 

* invalid characters in the device token (it should only contain a-z 0-9, no spaces or other punctuation)
* the device token belongs to a different application genereated with a different certificate

### Other Errors

You may get other errors reported back, they will hopefully have a descriptive error message.


### Getting an "ok" response but not receiving a push

The APNS protocol does not actually acknowledge successful push notifications, it only reports when an error has occurred. To compensate for this, dozer has a timeout mechanism where it will wait for an error for a certain number of milliseconds before assuming it was successful and returning the "ok" response to the client. 

If you are getting the `{"response": "ok"}` response but not receiving a push notification, try increasing the timeout to give dozer longer to catch an error returned from Apple.


