# H5P-Hub Protocol

## Updating the Content Type Cache

Perform this regularly (cronjob)

1. Register if needed (get uuid)
2. Compile usage statistics if set
3. fetch content types from Hub (by sending info about site including usage statistics, all in one combined object)
4. Update cache

## Registration

`POST https://api.h5p.org/v1/sites` with following as params:

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
          deleted: number, // number of 'deleted' events from log
          resultViews: number, // number of 'resultViews' events from log
          shortcodeInserts: number // number of 'shortcode insert' events from log
        }
      }
    }

## Fetching hub data

`POST https://api.h5p.org/v1/content-types/` with combination of registration data and usage statistics in body (x-www-form-url-encoded)
returns a JSON file with library information (could be empty), then: 

- store the cache somewhere
- Update timestamp of last fetch

## Storing content type cache

For example in a database table:

    left: column name; right: property in JSON got from H5P hub
    machine_name: id,
    major_version: version->major,
    minor_version: version->minor,
    patch_version: version->patch,
    h5p_major_version: coreApiVersionNeeded->major,
    h5p_minor_version: coreApiVersionNeeded->minor,
    title: title,
    summary: summary,
    description: description,
    icon : icon,
    created_at: createdAt (format?),
    updated_at: updatedAt (format?),
    is_recommended: isRecommended (boolean),
    popularity: popularity,
    screenshots: screenshots (as JSON text),
    license: license (as JSON text or empty array),
    example: example,
    tutorial: tutorial (or empty text),
    keywords: keywords (as JSON text or empty array),
    categories: categories (as JSON text or empty array),
    owner: owner

## Getting the content type cache

Add the following to the output:

    {
      outdated: boolean, // true: The cache is outdated and not able to update
      libraries: ..., // all libraries that are currently available to the 
      user (local and external)
      recentlyUsed: [], // machine names of most recently used libraries of the active user (first most recently used)
      apiVersion: { major: number, minor: number },
      details: // info messages can be null
    }

## Adding local libraries to the content cache

get latest library versions (only marked as runnable)

    - return { id, machineName, title, majorVersion, minorVersion, patchVersion, hasIcon, restricted }[]
  
getUserSpecificContentTypeCache

    - get full content type cache
    - set restricted property if necessary
    - convert cache data of each library to JSON with
      - 'id'              => intval($cached_library->id),
        'machineName'     => $cached_library->machine_name,
        'majorVersion'    => intval( $cached_library->major_version),
        'minorVersion'    => intval($cached_library->minor_version),
        'patchVersion'    => intval($cached_library->patch_version),
        'h5pMajorVersion' => intval($cached_library->h5p_major_version),
        'h5pMinorVersion' => intval($cached_library->h5p_minor_version),
        'title'           => $cached_library->title,
        'summary'         => $cached_library->summary,
        'description'     => $cached_library->description,
        'icon'            => $cached_library->icon,
        'createdAt'       => intval($cached_library->created_at),
        'updatedAt'       => intval($cached_library->updated_at),
        'isRecommended'   => $cached_library->is_recommended != 0,
        'popularity'      => intval($cached_library->popularity),
        'screenshots'     => json_decode($cached_library->screenshots),
        'license'         => json_decode($cached_library->license),
        'owner'           => $cached_library->owner,
        
        'installed'       => FALSE,
        'isUpToDate'      => FALSE,
        'restricted'      => $restricted (see above),
        'canInstall'      => !$restricted (see above),

        // below: only if not empty (optional)
        'categories'?     => json_decode($cached_library->categories);
        'keywords'?       => json_decode($cached_library->keywords);
        'tutorial'?       => $cached_library->tutorial;
        'example'?        => $cached_library->example;
      }

mergeWithLocalLibs(localLibraries, cachedLibraries) in PHP see: mergeLocalLibsIntoCachedLibs (in h5peditor.class.php)

    - go through all local libraries: add local libraries to supplement content type cache (just add to existing structure passed to the function)
      - set icon path
      - go through all cached libraries
        - check if identical to local lib: yes ?
          - is_local_only = false
          - lib->installed = true
          - lib->restricted = ...
          - lib->localMajorVersion = ...
          - lib->localMinorVersion = ...
          - lib->localPatchVersion = ...
          - check if local lib is newer or same as cache
            - yes: lib->isUpToDate = true
      - is_local_only == true ? -> add minimal data
          'id'                => (int) $local_lib->id,
          'machineName'       => $local_lib->machine_name,
          'title'             => $local_lib->title,
          'description'       => '',
          'majorVersion'      => (int) $local_lib->major_version,
          'minorVersion'      => (int) $local_lib->minor_version,
          'patchVersion'      => (int) $local_lib->patch_version,
          'localMajorVersion' => (int) $local_lib->major_version,
          'localMinorVersion' => (int) $local_lib->minor_version,
          'localPatchVersion' => (int) $local_lib->patch_version,
          'canInstall'        => FALSE,
          'installed'         => TRUE,
          'isUpToDate'        => TRUE,
          'owner'             => '',
          'restricted'        => ...
          'icon'?             => path
    - set H5P.Questionnaire and H5P.FreeTextQuestion to restricted if setting enable_lrs_content_types is false
