# Forward proxy support

@lumieducation/h5p-server has to make outgoing HTTPS requests to contact the H5P
Hub. If your network requires the use of a forward proxy to reach the Internet,
you must configure @lumieducation/h5p-server to use it for the HTTPS requests.

There are two ways of enabling the proxy:

1. Set the `proxy` property in IH5PConfig like this:
    ```json
    {
        "proxy": {
            "host": "10.1.2.3",
            "port": 8080,
            "protocol": "https" // can also be left out or set to "http" if your proxy can't be accessed with https
        }
    }
    ```

2. Set the HTTPS_PROXY environment variable like this:

    ``HTTPS_PROXY=http://10.1.2.3:8080``
    or
    ``HTTPS_PROXY=https://10.1.2.3:8080``

    (depending on whether your proxy can be accessed with https).
