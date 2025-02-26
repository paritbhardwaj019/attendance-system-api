const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

/**
 * Uploads a single file to S3.
 * @param {Object} file - The file object, e.g., from multer.
 * @param {String} folder - The folder name in S3 bucket.
 * @returns {String} - The URL of the uploaded file.
 */
const uploadFileToS3 = async (file, folder) => {
  if (!file) return null;

  try {
    const fileContent = fs.readFileSync(file.path);

    const fileExtension = file.originalname.split('.').pop();
    const key = `${folder}/${uuidv4()}.${fileExtension}`;

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();

    return data.Location;
  } catch (error) {
    throw error;
  }
};

/**
 * Uploads multiple files to S3.
 * @param {Array} files - Array of file objects.
 * @param {String} folder - The folder name in S3 bucket.
 * @returns {Array} - Array of URLs of the uploaded files.
 */
const uploadMultipleFilesToS3 = async (files, folder) => {
  if (!files || files.length === 0) return [];

  try {
    const uploadPromises = files.map((file) => uploadFileToS3(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls.filter((url) => url !== null);
  } catch (error) {
    console.error('Error uploading files to S3:', error);
    throw error;
  }
};

module.exports = { uploadFileToS3, uploadMultipleFilesToS3 };
