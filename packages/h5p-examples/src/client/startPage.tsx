import React from 'react';
import { createRoot } from 'react-dom/client';

import ContentTypeCacheComponent from './ContentTypeCacheComponent.js';
import LibraryAdmin from './LibraryAdminComponent.js';

const libraryAdminContainer = document.querySelector(
    '#library-admin-container'
);
if (libraryAdminContainer) {
    createRoot(libraryAdminContainer).render(
        <LibraryAdmin endpointUrl="h5p/libraries" />
    );
}

const contentTypeCacheContainer = document.querySelector(
    '#content-type-cache-container'
);
if (contentTypeCacheContainer) {
    createRoot(contentTypeCacheContainer).render(
        <ContentTypeCacheComponent endpointUrl="h5p/content-type-cache" />
    );
}
