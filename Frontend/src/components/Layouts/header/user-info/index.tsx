"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { authApi } from "@/lib/api";
import { getCurrentUser } from "@/lib/api-helpers";
import { getImageUrl } from "@/lib/getImageUrl";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());

    const handleProfileUpdated = () => {
      setUser(getCurrentUser());
    };

    window.addEventListener("profile-updated", handleProfileUpdated);
    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdated);
    };
  }, []);

  const USER = {
    name: user?.name || "User",
    email: user?.email || "user@kopma.com",
    img: getImageUrl(user?.photo),
    role: user?.role || "ANGGOTA",
  };

  // Generate initials from name for avatar placeholder
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Check if user has a real photo
  const hasPhoto = !!user?.photo;

  const handleLogoutClick = () => {
    setIsOpen(false);
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    authApi.logout();
    router.push("/auth/sign-in");
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          {hasPhoto ? (
            <Image
              src={USER.img}
              className="size-12 rounded-full"
              alt={`Avatar of ${USER.name}`}
              role="presentation"
              width={200}
              height={200}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-lg font-semibold text-white">
              {getInitials(USER.name)}
            </div>
          )}
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{USER.name}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          {hasPhoto ? (
            <Image
              src={USER.img}
              className="size-12 rounded-full"
              alt={`Avatar for ${USER.name}`}
              role="presentation"
              width={200}
              height={200}
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-lg font-semibold text-white">
              {getInitials(USER.name)}
            </div>
          )}

          <figcaption className="min-w-0 space-y-1 text-base font-medium">
            <div className="mb-2 truncate text-dark dark:text-white">
              {USER.name}
            </div>

            <div className="break-words text-gray-6">{USER.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={handleLogoutClick}
          >
            <LogOutIcon />

            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>

      {/* Logout Confirmation Modal */}
      {showLogoutModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-stroke bg-white p-6 shadow-xl dark:border-strokedark dark:bg-boxdark">
              {/* Modal Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dark dark:text-white">
                    Konfirmasi Logout
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Apakah Anda yakin ingin keluar?
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Anda akan keluar dari sesi saat ini dan perlu login kembali
                  untuk mengakses akun Anda.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleLogoutCancel}
                  className="rounded-lg border border-stroke bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Batal
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Ya, Keluar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </Dropdown>
  );
}
