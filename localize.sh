rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/client -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/copyright-semantics -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/hub -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/library-metadata -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/metadata-semantics -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/mongo-s3-content-storage -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/s3-temporary-storage -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/server -m i18next
rm -rf .json-autotranslate-cache
npx json-autotranslate -d --directory-structure ngx-translate -c google_translate.json -s google-translate --decode-escapes -t key-based -i packages/h5p-server/assets/translations/storage-file-implementations -m i18next
rm -rf .json-autotranslate-cache
npx prettier --write packages/h5p-server/assets/translations/**/*.json