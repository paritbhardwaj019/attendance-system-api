const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (
    (file.fieldname === 'photos' && ['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) ||
    (file.fieldname === 'pdfs' && file.mimetype === 'application/pdf')
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type for ${file.fieldname}. Allowed types: ${file.fieldname === 'photos' ? 'JPEG, PNG, GIF' : 'PDF'}`
      ),
      false
    );
  }
};

const limits = {
  fileSize: 10 * 1024 * 1024,
};

const upload = multer({ storage, fileFilter, limits });

module.exports = upload;
