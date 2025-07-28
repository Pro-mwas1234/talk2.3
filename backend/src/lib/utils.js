import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import { promisify } from "util";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Promisify Cloudinary methods
const uploadAsync = promisify(cloudinary.uploader.upload);
const uploadLargeAsync = promisify(cloudinary.uploader.upload_large);

// Existing JWT function
export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks cross-site scripting attacks
    sameSite: "strict", // CSRF attacks cross-site request forgery attacks
    secure: process.env.NODE_ENV !== "development",
  });

  return token;
};

// New Cloudinary utility functions
export const uploadToCloudinary = async (file, options = {}) => {
  try {
    // Default optimization options
    const defaultOptions = {
      resource_type: "auto",
      quality: "auto",
      fetch_format: "auto",
      transformation: [
        { width: 1920, crop: "limit" }, // Limit maximum dimensions
        { quality: "auto:good" } // Balance quality and size
      ],
      ...options
    };

    // Check if file is buffer or path
    const uploadSource = file.buffer ? { 
      resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
      filename: file.originalname,
      buffer: file.buffer 
    } : file;

    // Choose appropriate upload method based on size
    const uploadMethod = file.size > 10 * 1024 * 1024 ? uploadLargeAsync : uploadAsync;
    
    const result = await uploadMethod(uploadSource, {
      ...defaultOptions,
      chunk_size: file.size > 10 * 1024 * 1000 ? 6000000 : undefined // 6MB chunks for large files
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return {
      success: false,
      error: error.message,
      code: error.http_code || 500
    };
  }
};

export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: true };
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return { success: false, error: error.message };
  }
};

// File validation utility
export const validateFile = (file, options = {}) => {
  const {
    maxSizeMB = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  } = options;

  if (!file) {
    return { valid: false, error: "No file provided" };
  }

  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}` };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `File exceeds ${maxSizeMB}MB size limit` };
  }

  return { valid: true };
};
