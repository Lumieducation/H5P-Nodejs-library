# Reverse Engineering docs of the new H5P Content Hub

## New files in core

js/h5p-hub-registration.js
js/h5p-hub-sharing.js
styles/h5p-hub-registration.js
styles/h5p-hub-sharing.js

all seem to be unreferenced in core code

## Authorization
Authorization header: 'Basic ' . base64_encode("$site_uuid:$hub_secret");

## Endpoints

GET https://hub-api.h5p.org/v1/metadata?lang=en
variables: lastChecked, lastModified
    lang=ISO 639-1
    use header: If-Modified-Since
    HTTP 304 --> do nothing
    HTTP 200
        --> set lastChecked to now
        --> replace hub metadata

GET https://hub-api.h5p.org/v1/contents/search

GET https://hub-api.h5p.org/v1/contents/<id>
    request
        headers:
            Authorization: ...
            Accept: application/json
    response:
        empty data --> = unauthorized
        status 404 --> abort
        != 200 --> connection failed
    return data

GET https://hub-api.h5p.org/v1/contents/<id>/status
    request
        headers:
            Authorization: ...
            Accept: application/json
    response:
        HTTP 403
        HTTP != 200
        {
            messages: {
                info: string[]; //?
                error: {
                    message: string;
                    code: string;
                }[] //?
            },
            status: 2 (WAITING) | 1 (DOWNLOADED)
        }
    return newState // ?

POST https://hub-api.h5p.org/v1/contents
    request
        headers:
            Authorization: ...
            Accept: application/json
        data["published"] = 1 (for create new / update)
    response
        HTTP 403 --> unauthorized
        HTTP != 200 --> connection failed
        return structure:
        {
            success: boolean;
            errors: any;
            ...
        }        

PUT https://hub-api.h5p.org/v1/contents/<id>
like POST
    request:
        data:
            _method: PUT
    request
        data["published"] = 1 (for update)
        data["published"] = 0 (for unpublish; set nothing else but headers and use PUT)
        data: (for resync)
        {
            download_url: <path to .h5p file>,
            resync: 1
        }

GET https://hub-api.h5p.org/v1/accounts/<siteUuid>
    request
        headers:
            Authorization: ...
            Accept: application/json
    response
        HTTP 401
        HTTP != 200
        HTTP 200

POST https://hub-api.h5p.org/v1/accounts/<siteUuid>
    response
        {
            success: boolean,
            errors: {
                site_uuid: boolean;
                log: string[];
            }
            account: {
                secret: string
            }
        }
        --> store account.secret


PUT https://hub-api.h5p.org/v1/accounts/<siteUuid>
    request
        headers:
            Authorization: ...
        data:
            _method: PUT
