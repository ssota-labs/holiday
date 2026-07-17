'use client';

// The client boundary for the whole render layer.
//
// vinext is RSC: a server component that imports @holiday-cfo/blocks directly
// would pull in the catalog, which imports @json-render/react, which calls
// createContext at module load — and there is no createContext on the server. It
// dies with "createContext is not a function" before rendering a thing.
//
// This file carries 'use client', so everything it imports — the blocks barrel
// and all of json-render — is evaluated in the browser, where createContext
// exists. page.tsx (a server component) imports THIS, sees a client reference,
// and never evaluates the barrel itself.
export { Dashboard } from '@holiday-cfo/blocks';
