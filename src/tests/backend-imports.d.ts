// A few frontend tests import backend modules (e.g. propertyController) to check
// both sides agree on field lists. The backend gets req.user / req.files from
// these augmentations, which the frontend type check doesn't otherwise load.
/// <reference path="../../backend/node_modules/@types/passport/index.d.ts" />
/// <reference path="../../backend/node_modules/@types/multer/index.d.ts" />
/// <reference path="../../backend/src/types/passport.d.ts" />
