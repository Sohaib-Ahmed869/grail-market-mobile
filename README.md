# grail-market-mobile

Not started yet. This repo exists so the mobile client has somewhere to land.

The backend is client-agnostic — the web client uses nothing a phone could not —
so a mobile app is a new front end over the same API rather than new backend
work.

## What it will talk to

`grail-market-backend`, over plain HTTP/JSON. No SDK, no auth today.

```
POST /scans                     multipart: front (required), back (optional)
                                -> the identification, the grading label, and
                                   the valuation, in one response

GET  /market/search?q=          search by name, or by a card code like OP13-119
GET  /market/price?name=&number=&grader=&grade=
                                price a card found by search
GET  /market/listings?name=&number=&grader=&grade=
                                live listings for a card
GET  /market/fx                 currency rates, USD base
```

`POST /scans` takes 10–30 seconds: it reads the card, resolves it against
several catalogues, and prices it. Design the capture screen around that — the
web client shows the pipeline stage as it goes rather than a spinner.

## Worth knowing before building the camera screen

Identification lives or dies on the photograph. The two failures that have cost
the most are a collector number too small to read, and a grading label cropped
out of frame. Both are capture problems, and a phone is the one place they can
actually be fixed — guide the frame, hold for focus, and check sharpness before
uploading rather than after.

Do not downscale before upload. Shrinking to 2000px once lost a collector
number and mispriced a card by thirty times.
