import { uploadToCloudinary } from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file uploaded.' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'sgfi_player_photos');

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to Cloudinary.',
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return res.status(500).json({ success: false, message: 'Cloudinary upload failed.', error: error.message });
  }
};
