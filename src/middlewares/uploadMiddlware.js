const multer = require('multer');
const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, '../temp/uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    (file.fieldname === 'photos' && ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'].includes(file.mimetype)) ||
    (file.fieldname === 'pdfs' && file.mimetype === 'application/pdf')
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type for ${file.fieldname}. Allowed types: ${
          file.fieldname === 'photos' ? 'JPG, JPEG, PNG, GIF' : 'PDF'
        }`
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
