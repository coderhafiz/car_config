const CACHE_PREFIX = "customly-u-3d-assets-";
const CACHE_NAME = `${CACHE_PREFIX}v5`;

const CRITICAL_DECODERS = [
  "/draco/draco_decoder.js",
  "/draco/draco_decoder.wasm",
  "/draco/draco_wasm_wrapper.js",
  "/basis/basis_transcoder.js",
  "/basis/basis_transcoder.wasm",
];

const CACHEABLE_PATH_PREFIXES = [
  "/cars/",
  "/draco/",
  "/basis/",
  "/hdri/",
  "/textures/",
];

// Deduplicate concurrent network fetches for the same 3D model URL
const inFlightRequests = new Map();

function isCacheableAssetRequest(request) {
  if (request.method !== "GET") return false;
  if (request.headers.has("range")) return false;
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return CACHEABLE_PATH_PREFIXES.some((prefix) =>
      url.pathname.startsWith(prefix)
    );
  } catch {
    return false;
  }
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          CRITICAL_DECODERS.map((url) =>
            fetch(url, { cache: "force-cache" }).then((res) => {
              if (res && res.status === 200) {
                return cache.put(url, res);
              }
            })
          )
        )
      )
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableAssetRequest(request)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request, {
        ignoreVary: true,
      });
      if (cachedResponse) {
        return cachedResponse;
      }

      const key = request.url;
      let networkPromise = inFlightRequests.get(key);
      if (!networkPromise) {
        networkPromise = fetch(request)
          .then(async (response) => {
            if (response && response.status === 200 && response.ok) {
              try {
                await cache.put(request, response.clone());
              } catch {
                // Ignore quota errors if device disk is completely full
              }
            }
            return response;
          })
          .finally(() => {
            inFlightRequests.delete(key);
          });
        inFlightRequests.set(key, networkPromise);
      }

      const sharedResponse = await networkPromise;
      return sharedResponse.clone();
    })()
  );
});

