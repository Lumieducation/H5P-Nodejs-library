# H5P-Hub Protocol

## Updating the Content Type Cache

Perform this regularly (cronjob)

1. Register if needed (get uuid)
2. Compile usage statistics if set
3. fetch content types from Hub (by sending info about site including usage statistics, all in one combined object)
4. Update cache

## Registration

POST https://api.h5p.org/v1/sites with following as params:
{
  uuid: string, // can be '' to register
  platform_name: string, // "test"
  platform_version: string, // "1.0"
  h5p_version: string, // "1.22"
  disabled: number, // 1 or 0 ("fetching disabled")
  local_id: number, // crc32 hash of full plugin path used as id
  type: string // ?? "site_type": "local"
  core_api_version: string // "1.19"
}
returns JSON object: 
{
  uuid: string // store this object in the future
}

## Sending Usage Statistics
Compile object with:
{
  num_authors: numbers, // number of active authors
  libraries: {
    'H5P.XXX 1.5': {
      patch: number, // ??? patch version
      content: number, // number of instances
      loaded: number, // number of 'loaded' events (= views?) from log
      created: number, // number of 'created' events from log
      createdUpload: number, // number of 'createdUpload' events from log
      deleted: number, // number of 'delted' events from log
      resultViews: number, // number of 'resultViews' events from log
      shortcodeInserts: number // number of 'shortcode insert' events from log
    }
  }
}

## Fetching hub data

POST https://api.h5p.org/v1/content-types/ with combination of registration data and usage statistics in body (x-www-form-url-encoded)
returns a JSON file with library information (could be empty)
then: 
  store the cache somewhere
  Update timestamp of last fetch