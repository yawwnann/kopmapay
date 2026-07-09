"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { profileApi, savingsApi } from "@/lib/api";
import { getImageUrl } from "@/lib/getImageUrl";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Shield,
  Edit2,
  Save,
  X,
  Wallet,
  TrendingUp,
  Building,
  BookOpen,
} from "lucide-react";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  angkatan: string;
  photo?: string;
  bio: string;
  phone?: string;
  address?: string;
  joinDate: string;
  createdAt?: string;
  nim?: string;
  fakultas?: string;
  prodi?: string;
}

interface SavingsData {
  total: number;
  pokok: number;
  wajib: number;
  sukarela: number;
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [savings, setSavings] = useState<SavingsData | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    bio: "",
    phone: "",
    address: "",
  });
  const router = useRouter();

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (!token) {
      router.push("/auth/sign-in");
      return;
    }

    const initProfilePage = async () => {
      const profile = await loadProfile();
      await loadSavings(profile?.role);
    };

    void initProfilePage();
  }, []);

  async function loadProfile() {
    setLoading(true);
    try {
      const response = await profileApi.getMyProfile();
      if (response.success && response.data) {
        const rawProfile = response.data as Partial<ProfileData>;
        const normalizedJoinDate =
          rawProfile.joinDate ||
          rawProfile.createdAt ||
          new Date().toISOString();

        const profileData: ProfileData = {
          id: rawProfile.id || "",
          name: rawProfile.name || "-",
          email: rawProfile.email || "-",
          role: rawProfile.role || "ANGGOTA",
          angkatan: rawProfile.angkatan || "-",
          photo: rawProfile.photo,
          bio: rawProfile.bio || "",
          phone: rawProfile.phone,
          address: rawProfile.address,
          joinDate: normalizedJoinDate,
          nim: rawProfile.nim,
          fakultas: rawProfile.fakultas,
          prodi: rawProfile.prodi,
        };

        setData(profileData);
        setEditForm({
          name: profileData.name,
          bio: profileData.bio,
          phone: profileData.phone || "",
          address: profileData.address || "",
        });
        if (typeof window !== "undefined") {
          localStorage.setItem("current_user", JSON.stringify(response.data));
          window.dispatchEvent(new Event("profile-updated"));
        }

        return profileData;
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("current_user");
        }
        router.push("/auth/sign-in");
        return null;
      }
    } catch (error: any) {
      console.error("Failed to load profile:", error);
      const errorMsg = error?.message?.toLowerCase() || "";
      if (
        errorMsg.includes("authentication") ||
        errorMsg.includes("unauthorized") ||
        errorMsg.includes("401") ||
        errorMsg.includes("token") ||
        errorMsg.includes("missing")
      ) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth_token");
          localStorage.removeItem("current_user");
        }
        router.push("/auth/sign-in");
        return null;
      }
      setMessage({ type: "error", text: "Gagal memuat data profile." });
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function loadSavings(role?: string) {
    try {
      if (role === "ADMIN") {
        const allSavingsResponse = await savingsApi.getAllSavings();
        if (
          allSavingsResponse.success &&
          Array.isArray(allSavingsResponse.data)
        ) {
          const balances = allSavingsResponse.data.map((item: any) =>
            Number(item?.total ?? item?.balance ?? 0),
          );
          const total = balances.reduce((sum, amount) => sum + amount, 0);

          // Fallback ratio when API doesn't provide admin-wide breakdown per type
          const pokok = Math.round(total * 0.2);
          const wajib = Math.round(total * 0.5);
          const sukarela = Math.round(total * 0.3);

          setSavings({ total, pokok, wajib, sukarela });
          return;
        }
      }

      const response = await savingsApi.getSavingsBreakdown();
      if (response.success && response.data) {
        const savingsData = response.data as any;
        setSavings({
          total: savingsData.total || 0,
          pokok:
            savingsData.details?.find((d: any) => d.type === "Simpanan Pokok")
              ?.amount || 0,
          wajib:
            savingsData.details?.find((d: any) => d.type === "Simpanan Wajib")
              ?.amount || 0,
          sukarela:
            savingsData.details?.find(
              (d: any) => d.type === "Simpanan Sukarela",
            )?.amount || 0,
        });
      }
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("savings account not found")) {
        setSavings({ total: 0, pokok: 0, wajib: 0, sukarela: 0 });
        return;
      }

      console.error("Failed to load savings:", error);
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMessage({ type: "error", text: "Ukuran foto maksimal 2 MB." });
        e.target.value = "";
        return;
      }
      setPhotoFile(file);
      if (data) {
        setData({ ...data, photo: URL.createObjectURL(file) });
      }
    }
  };

  const handleSave = async () => {
    if (!data) return;

    try {
      const response = await profileApi.updateProfile({
        name: editForm.name,
        bio: editForm.bio,
        phone: editForm.phone,
        address: editForm.address,
      });

      let photoResponse;
      if (photoFile) {
        const formData = new FormData();
        formData.append("photo", photoFile);
        photoResponse = await profileApi.updateProfilePhoto(formData);
        if (photoResponse.success) {
          setPhotoFile(null);
        }
      }

      if (response.success || photoResponse?.success) {
        setMessage({ type: "success", text: "Profile berhasil diperbarui." });
        setIsEditing(false);
        loadProfile();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Gagal memperbarui profile.",
      });
    }
  };

  const handleCancel = () => {
    if (data) {
      setEditForm({
        name: data.name,
        bio: data.bio,
        phone: data.phone || "",
        address: data.address || "",
      });
    }
    setIsEditing(false);
    loadProfile();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat data profile...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-stroke bg-white p-12 text-center shadow-sm dark:border-strokedark dark:bg-boxdark">
        <p className="text-red-500">Gagal memuat data profile.</p>
      </div>
    );
  }

  const formatRupiah = (num: number) =>
    "Rp " + new Intl.NumberFormat("id-ID").format(num);

  const formatDate = (dateString: string) => {
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getJoinYear = (dateString: string) => {
    const parsedDate = new Date(dateString);
    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.getFullYear();
  };

  return (
    <div className="mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kelola informasi profil dan akun Anda
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/"
            className="text-gray-500 hover:text-primary dark:text-gray-400"
          >
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-primary">Profile</span>
        </nav>
      </div>

      {/* Alert Message */}
      {message && (
        <div
          className={`flex items-center gap-3 rounded-lg border p-4 ${
            message.type === "success"
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          <span className="text-sm font-medium">{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-stroke bg-white shadow-card dark:border-strokedark dark:bg-boxdark">
            {/* Profile Header */}
            <div className="flex flex-col items-center p-6">
              {/* Avatar */}
              <div className="relative">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-primary/10 ring-4 ring-primary/20">
                  {data.photo ? (
                    <Image
                      src={getImageUrl(data.photo)}
                      alt={data.name}
                      width={112}
                      height={112}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-14 w-14 text-primary" />
                  )}
                </div>
                {isEditing && (
                  <label className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90">
                    <Edit2 className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      name="photo"
                      className="sr-only"
                      onChange={handlePhotoChange}
                      accept="image/png, image/jpg, image/jpeg"
                    />
                  </label>
                )}
              </div>
              
              {isEditing && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Maksimal ukuran foto 2 MB</p>
              )}

              {/* Name & Role */}
              <div className="mt-4 text-center">
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editForm.name}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-center text-lg font-bold text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-dark dark:text-white">
                    {data.name}
                  </h2>
                )}
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                      data.role === "ADMIN"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : "bg-blue-light/20 text-primary dark:bg-blue-dark/30 dark:text-blue-light"
                    }`}
                  >
                    <Shield className="h-3 w-3" />
                    {data.role === "ADMIN" ? "Administrator" : "Anggota"}
                  </span>
                </div>
              </div>

              {/* Member Since */}
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Bergabung {formatDate(data.joinDate)}</span>
              </div>
            </div>

            {/* Bio Section */}
            <div className="border-t border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tentang Saya
              </h3>
              {isEditing ? (
                <textarea
                  name="bio"
                  value={editForm.bio}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark-2 dark:text-white dark:focus:border-primary"
                  rows={3}
                  placeholder="Ceritakan tentang diri Anda..."
                />
              ) : (
                <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {data.bio || "Belum ada deskripsi."}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="border-t border-stroke px-6 py-4 dark:border-strokedark">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary/90"
                  >
                    <Save className="h-4 w-4" />
                    Simpan
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 rounded-lg border border-stroke px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-stroke px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Info Cards */}
        <div className="space-y-6 lg:col-span-2">
          {/* Savings Overview */}
          {savings && (
            <div className="rounded-xl border border-stroke bg-white shadow-card dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                <h3 className="flex items-center gap-2 text-base font-semibold text-dark dark:text-white">
                  <Wallet className="h-5 w-5 text-primary" />
                  Ringkasan Simpanan
                </h3>
              </div>
              <div className="p-6">
                {/* Total */}
                <div className="mb-6 rounded-lg bg-gradient-to-r from-primary to-blue-dark p-6 text-white">
                  <p className="text-sm font-medium opacity-80">
                    Total Simpanan
                  </p>
                  <p className="mt-1 text-3xl font-bold">
                    {formatRupiah(savings.total)}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-boxdark-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Simpanan Pokok
                        </p>
                        <p className="mt-0.5 font-semibold text-dark dark:text-white">
                          {formatRupiah(savings.pokok)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-boxdark-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Simpanan Wajib
                        </p>
                        <p className="mt-0.5 font-semibold text-dark dark:text-white">
                          {formatRupiah(savings.wajib)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-stroke bg-gray-50 p-4 dark:border-strokedark dark:bg-boxdark-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Simpanan Sukarela
                        </p>
                        <p className="mt-0.5 font-semibold text-dark dark:text-white">
                          {formatRupiah(savings.sukarela)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal Information */}
          <div className="rounded-xl border border-stroke bg-white shadow-card dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="flex items-center gap-2 text-base font-semibold text-dark dark:text-white">
                <User className="h-5 w-5 text-primary" />
                Informasi Personal
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Email
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
                      {data.email}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Telepon
                    </p>
                    {isEditing ? (
                      <input
                        type="text"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleChange}
                        className="mt-0.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                        placeholder="Masukkan nomor telepon"
                      />
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
                        {data.phone || "-"}
                      </p>
                    )}
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4 sm:col-span-2">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Alamat
                    </p>
                    {isEditing ? (
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleChange}
                        className="mt-0.5 w-full rounded-lg border border-stroke bg-transparent px-3 py-1.5 text-sm text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                        rows={2}
                        placeholder="Masukkan alamat"
                      />
                    ) : (
                      <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
                        {data.address || "-"}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          {data.role !== "ADMIN" && (
            <div className="rounded-xl border border-stroke bg-white shadow-card dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke px-6 py-4 dark:border-strokedark">
                <h3 className="flex items-center gap-2 text-base font-semibold text-dark dark:text-white">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Informasi Akademik
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {/* NIM */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        NIM
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                        {data.nim || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Angkatan */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Angkatan
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                        {data.angkatan}
                      </p>
                    </div>
                  </div>

                  {/* Tahun Masuk */}
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Tahun Masuk
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-dark dark:text-white">
                        {getJoinYear(data.joinDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fakultas & Prodi */}
                {(data.fakultas || data.prodi) && (
                  <div className="mt-6 grid grid-cols-1 gap-6 border-t border-stroke pt-6 dark:border-strokedark sm:grid-cols-2">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                        <Building className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Fakultas
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
                          {data.fakultas || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Program Studi
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-dark dark:text-white">
                          {data.prodi || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
