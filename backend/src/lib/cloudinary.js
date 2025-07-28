import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";

config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Utility function to check file size
const checkFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`);
  }
  return true;
};

// Enhanced upload function with optimizations
const uploadImage = async (file, options = {}) => {
  try {
    // Default optimization options
    const defaultOptions = {
      quality: "auto",
      fetch_format: "auto",
      transformation: [
        { width: 1920, crop: "limit" }, // Limit maximum dimensions
        { quality: "auto:good" } // Balance quality and size
      ]
    };

    // Check file size before uploading
    checkFileSize(file);

    // Upload with merged options
    const result = await cloudinary.uploader.upload(file.path || file, {
      ...defaultOptions,
      ...options
    });

    return {
      success: true,
      result,
      message: "Image uploaded successfully"
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);

    // Handle specific error cases
    if (error.message.includes("File size")) {
      return {
        success: false,
        error: error.message,
        suggestion: "Please compress the image before uploading"
      };
    }

    if (error.http_code === 413) {
      return {
        success: false,
        error: "Image too large for Cloudinary",
        suggestion: "Try reducing the image size below 10MB or upgrade your Cloudinary plan"
      };
    }

    return {
      success: false,
      error: "Image upload failed",
      details: error.message
    };
  }
};

// Function for large files (chunked upload)
const uploadLargeFile = async (filePath, options = {}) => {
  try {
    return await cloudinary.uploader.upload_large(filePath, {
      resource_type: "auto",
      chunk_size: 6000000, // 6MB chunks
      ...options
    });
  } catch (error) {
    console.error("Large file upload error:", error);
    throw error;
  }
};

export { cloudinary as default, uploadImage, uploadLargeFile };
