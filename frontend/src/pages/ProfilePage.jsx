import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Mail, User, XCircle } from "lucide-react";
import { uploadImage } from "../utils/cloudinary";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const MAX_IMAGE_SIZE_MB = 10; // 10MB limit for free Cloudinary accounts

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset states
    setUploadError(null);
    setUploadProgress(0);
    e.target.value = ""; // Reset input to allow re-upload of same file

    // Validate file type
    if (!file.type.match(/image\/(jpeg|png|jpg|gif|webp)/)) {
      setUploadError("Please upload a valid image (JPEG, PNG, JPG, GIF, or WEBP)");
      return;
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setUploadError(`Image exceeds ${MAX_IMAGE_SIZE_MB}MB limit. Please choose a smaller file.`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setSelectedImg(reader.result);
    reader.readAsDataURL(file);

    try {
      // Upload to Cloudinary with progress tracking
      const uploadResult = await uploadImage(file, {
        folder: "profile_pictures",
        transformation: [
          { width: 500, height: 500, crop: "fill", gravity: "face" }
        ],
        onUploadProgress: (progress) => {
          setUploadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || "Upload failed");
      }

      // Update profile with Cloudinary URL
      await updateProfile({ 
        profilePic: uploadResult.result.secure_url 
      });

    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error.message || "Failed to upload image");
      setSelectedImg(null);
    } finally {
      setUploadProgress(0);
    }
  };

  const removeImage = () => {
    setSelectedImg(null);
    setUploadError(null);
  };

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-2">Your profile information</p>
          </div>

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="relative">
                <img
                  src={selectedImg || authUser.profilePic || "/avatar.png"}
                  alt="Profile"
                  className="size-32 rounded-full object-cover border-4 border-primary/20 group-hover:border-primary/40 transition-all duration-200"
                />
                {selectedImg && !isUpdatingProfile && (
                  <button
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 hover:bg-red-600 transition-colors"
                    aria-label="Remove image"
                  >
                    <XCircle className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
              
              <label
                htmlFor="avatar-upload"
                className={`
                  absolute bottom-0 right-0 
                  bg-primary hover:bg-primary/90
                  p-2 rounded-full cursor-pointer 
                  transition-all duration-200
                  ${isUpdatingProfile ? "animate-pulse pointer-events-none opacity-70" : ""}
                `}
              >
                <Camera className="w-5 h-5 text-white" />
                <input
                  type="file"
                  id="avatar-upload"
                  className="hidden"
                  accept="image/jpeg, image/png, image/jpg, image/gif, image/webp"
                  onChange={handleImageUpload}
                  disabled={isUpdatingProfile}
                />
              </label>
            </div>

            {/* Upload Status */}
            <div className="text-center space-y-1 min-h-10">
              {isUpdatingProfile && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-primary">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
              
              {uploadError && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {uploadError}
                </p>
              )}

              {!isUpdatingProfile && !uploadError && (
                <p className="text-sm text-gray-500">
                  Click to upload (max {MAX_IMAGE_SIZE_MB}MB)
                </p>
              )}
            </div>
          </div>

          {/* Profile Information */}
          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.fullName}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">
                {authUser?.email}
              </p>
            </div>
          </div>

          {/* Account Information */}
          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Member Since</span>
                <span>{new Date(authUser.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Account Status</span>
                <span className="text-green-500">Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
