"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Check,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
} from "lucide-react";
import Cropper, { Area, Point } from "react-easy-crop";
import { getCurrentUser } from "@/lib/api-helpers";
import { getImageUrl } from "@/lib/getImageUrl";
import { profileApi } from "@/lib/api";

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas is empty"));
        resolve(blob);
      },
      "image/jpeg",
      0.9,
    );
  });
}

export function ProfileTab() {
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
        phone: currentUser.phone || "",
        address: currentUser.address || "",
        bio: currentUser.bio || "",
      });
    }
    setLoading(false);
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Ukuran foto maksimal 2 MB." });
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setSelectedFile(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    setUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], selectedFile?.name || "photo.jpg", {
        type: "image/jpeg",
      });
      const formData = new FormData();
      formData.append("photo", croppedFile);

      const response = await profileApi.updateProfilePhoto(formData);
      if (response.success) {
        const currentUser = JSON.parse(localStorage.getItem("current_user") || "{}");
        const photoUrl = response.data?.photo || response.data?.url || URL.createObjectURL(croppedBlob);
        const updatedUser = { ...currentUser, photo: photoUrl };
        localStorage.setItem("current_user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event("profile-updated"));
        setCropModalOpen(false);
        setImageSrc(null);
        setMessage({ type: "success", text: "Foto profil berhasil diperbarui." });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: "error", text: response.message || "Gagal mengunggah foto." });
      }
    } catch {
      setMessage({ type: "error", text: "Gagal memproses foto." });
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    setImageSrc(null);
    setSelectedFile(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await profileApi.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });

      if (response.success) {
        // Update localStorage agar data terbaru langsung tersimpan
        if (typeof window !== "undefined") {
          const currentUser = JSON.parse(
            localStorage.getItem("current_user") || "{}",
          );
          const updatedUser = {
            ...currentUser,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
          };
          localStorage.setItem("current_user", JSON.stringify(updatedUser));
          setUser(updatedUser);
          window.dispatchEvent(new Event("profile-updated"));
        }
        setMessage({ type: "success", text: "Profil berhasil diperbarui." });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: "error",
          text: response.message || "Gagal memperbarui profil.",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Gagal memperbarui profil." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-stroke bg-white p-12 dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.type === "success" ? (
            <Check className="h-4 w-4" />
          ) : (
            <X className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
        {/* Avatar Section */}
        <div className="flex items-center gap-6 border-b border-stroke p-6 dark:border-strokedark">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10">
              {user?.photo ? (
                <img
                  src={getImageUrl(user.photo)}
                  alt={user.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={handlePhotoClick}
              disabled={uploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h3 className="text-xl font-bold text-dark dark:text-white">
              {user?.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {user?.email}
            </p>
            <span
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user?.role === "ADMIN"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              }`}
            >
              {user?.role === "ADMIN" ? "Administrator" : "Anggota"}
            </span>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Maksimal ukuran foto 2 MB</p>
          </div>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                <User className="mr-2 inline h-4 w-4" />
                Nama Lengkap
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                <Mail className="mr-2 inline h-4 w-4" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                <Phone className="mr-2 inline h-4 w-4" />
                Telepon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
              />
            </div>

            {/* Address */}
            <div>
              <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
                <MapPin className="mr-2 inline h-4 w-4" />
                Alamat
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Kota, Provinsi"
                className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-dark dark:text-white">
              Tentang Saya
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Ceritakan tentang diri Anda..."
              className="w-full rounded-lg border border-stroke bg-white px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
            />
          </div>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>

      {/* Crop Modal */}
      {cropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="flex w-full max-w-lg flex-col rounded-xl bg-white shadow-xl dark:bg-boxdark">
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Potong Foto
              </h3>
              <button
                onClick={handleCropCancel}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative h-80 w-full bg-gray-100 dark:bg-gray-800">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className="px-6 py-4">
              <div className="flex items-center gap-3">
                <ZoomOut className="h-4 w-4 text-gray-500" />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <ZoomIn className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-stroke px-6 py-4 dark:border-strokedark">
              <button
                type="button"
                onClick={handleCropCancel}
                disabled={uploading}
                className="rounded-lg border border-stroke px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCropConfirm}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengunggah...
                  </>
                ) : (
                  "Simpan Foto"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
