import { uploadToCloudinary } from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image format. Supported formats: .png, .jpg, .jpeg, .webp',
      });
    }

    const folder = req.body?.folder || 'sgfi_certificates';
    const result = await uploadToCloudinary(req.file.buffer, folder);

    return res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully to Cloudinary.',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return res.status(500).json({ success: false, message: 'Cloudinary upload failed.', error: error.message });
  }
};
