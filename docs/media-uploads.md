# Direct media uploads

Authenticated clients upload directly to S3. The API never buffers a large file in application
memory. Redis stores the private upload-session owner and S3 multipart ID for 24 hours.

## Small files (under 25 MiB)

1. `POST /api/v1/media/uploads` with `fileName`, `mimeType`, and byte `size`.
2. `PUT` the bytes to `uploadUrl` using the returned required headers.
3. `POST /api/v1/media/uploads/{uploadToken}/complete`.

## Large files

1. `POST /api/v1/media/uploads`.
2. Split the file using the returned `partSize`.
3. Request at most 100 part URLs at a time with `POST /api/v1/media/uploads/{uploadToken}/parts` and
   `{ "partNumbers": [1, 2] }`.
4. Upload each part with `PUT` and retain the response `ETag` header.
5. Call `POST /api/v1/media/uploads/{uploadToken}/complete-multipart` with every part number and
   ETag.
6. Resume an interrupted upload by requesting fresh URLs only for unfinished parts.

Abort an unfinished upload with `POST /api/v1/media/uploads/{uploadToken}/abort`.

Configure S3 CORS to allow the frontend origin, `PUT`, and expose the `ETag` header. Configure an S3
lifecycle rule to abort incomplete multipart uploads after one day; this cleans up uploads whose
Redis session expires.

## Adaptive video playback

Uploading a 100 MB source does not itself create quality variants. A video pipeline must transcode
the source into an HLS/DASH adaptive bitrate ladder (for example 360p, 480p, 720p, and 1080p), store
the segments and manifest in S3, and publish the manifest through a CDN. The player uses the
manifest to automatically switch quality based on bandwidth.

This API returns `processingStatus: SOURCE_UPLOADED` for videos so a transcoding job can be attached
without falsely marking the source as playback-ready. Images and PDFs return `READY` after S3
size/content-type verification.
