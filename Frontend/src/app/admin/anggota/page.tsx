"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  usersApi,
  fakultasApi,
  paymentsApi,
  withdrawalsApi,
  savingsApi,
} from "@/lib/api";
import { getImageUrl } from "@/lib/getImageUrl";
import type {
  User,
  FakultasData,
  Payment,
  Withdrawal,
  SavingsBreakdown,
} from "@/types/api.types";
import { User as UserIcon, Eye } from "lucide-react";

type RoleType = "ADMIN" | "ANGGOTA";

interface FormState {
  name: string;
  email: string;
  role: RoleType;
  angkatan: string;
  nim: string;
  fakultas: string;
  prodi: string;
}

const initialFormState: FormState = {
  name: "",
  email: "",
  role: "ANGGOTA",
  angkatan: "",
  nim: "",
  fakultas: "",
  prodi: "",
};

export default function AnggotaPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <AnggotaContent />
    </ProtectedRoute>
  );
}

function AnggotaContent() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sortBy, setSortBy] = useState<"NAME_ASC" | "NAME_DESC" | "ANGKATAN_DESC" | "ANGKATAN_ASC" | "">("");
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<Withdrawal[]>([]);
  const [userSavings, setUserSavings] = useState<SavingsBreakdown | null>(null);

  // Reset password state
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(
    null,
  );
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);

  // Fakultas state
  const [fakultasList, setFakultasList] = useState<FakultasData[]>([]);
  const [prodiList, setProdiList] = useState<string[]>([]);
  const [fakultasLoading, setFakultasLoading] = useState(true);

  useEffect(() => {
    loadMembers();
    loadFakultas();
  }, []);

  async function loadMembers() {
    setLoading(true);
    try {
      const response = await usersApi.getList();
      if (response.success && Array.isArray(response.data)) {
        setMembers(response.data);
      }
    } catch (error) {
      console.error("Failed to load members:", error);
      setMessage({ type: "error", text: "Gagal memuat data anggota." });
    } finally {
      setLoading(false);
    }
  }

  async function loadFakultas() {
    setFakultasLoading(true);
    try {
      const response = await fakultasApi.getAllFakultas();
      if (response.success && response.data?.fakultas) {
        setFakultasList(response.data.fakultas);
      }
    } catch (error) {
      console.error("Failed to load fakultas:", error);
    } finally {
      setFakultasLoading(false);
    }
  }

  const handleFakultasChange = (fakultasName: string) => {
    setForm((prev) => ({ ...prev, fakultas: fakultasName, prodi: "" }));

    const selectedFakultas = fakultasList.find((f) => f.nama === fakultasName);
    if (selectedFakultas) {
      setProdiList(selectedFakultas.jurusan);
    } else {
      setProdiList([]);
    }
  };

  const openCreateModal = () => {
    setEditingMember(null);
    setForm(initialFormState);
    setModalOpen(true);
    setMessage(null);
  };

  const openEditModal = (member: User) => {
    setEditingMember(member);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
      angkatan: member.angkatan,
      nim: member.nim || "",
      fakultas: member.fakultas || "",
      prodi: member.prodi || "",
    });

    // Load prodi list based on fakultas
    if (member.fakultas) {
      const selectedFakultas = fakultasList.find(
        (f) => f.nama === member.fakultas,
      );
      if (selectedFakultas) {
        setProdiList(selectedFakultas.jurusan);
      }
    }

    setModalOpen(true);
    setMessage(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingMember(null);
    setForm(initialFormState);
    setProdiList([]);
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setMessage(null);

      if (!form.name.trim()) {
        setMessage({ type: "error", text: "Nama harus diisi." });
        return;
      }
      if (
        !form.email.trim() ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
      ) {
        setMessage({ type: "error", text: "Email tidak valid." });
        return;
      }
      if (!form.angkatan.trim()) {
        setMessage({ type: "error", text: "Angkatan harus diisi." });
        return;
      }

      setFormLoading(true);

      try {
        const userData = {
          name: form.name,
          email: form.email,
          role: form.role,
          angkatan: form.angkatan,
          nim: form.nim || undefined,
          fakultas: form.fakultas || undefined,
          prodi: form.prodi || undefined,
        };

        if (editingMember) {
          await usersApi.update(editingMember.id, userData);
          setMessage({ type: "success", text: "Anggota berhasil diperbarui." });
        } else {
          await usersApi.create(userData);
          setMessage({
            type: "success",
            text: "Anggota berhasil ditambahkan.",
          });
        }
        setForm(initialFormState);
        setEditingMember(null);
        setProdiList([]);
        await loadMembers();
        setTimeout(() => setModalOpen(false), 1000);
      } catch (error: any) {
        const errorMsg =
          error?.message || "Terjadi kesalahan. Silakan coba lagi.";
        setMessage({ type: "error", text: errorMsg });
      } finally {
        setFormLoading(false);
      }
    },
    [form, editingMember],
  );

  const handleToggleStatus = useCallback(async (member: User) => {
    setDeleteConfirm(member.id);
  }, []);

  const confirmToggleStatus = useCallback(async () => {
    if (!deleteConfirm) return;

    const member = members.find((m) => m.id === deleteConfirm);
    if (!member) return;

    try {
      await usersApi.update(member.id, { isActive: !member.isActive });
      await loadMembers();
      setMessage({
        type: "success",
        text: member.isActive
          ? "Anggota berhasil dinonaktifkan."
          : "Anggota berhasil diaktifkan.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Gagal mengubah status anggota.",
      });
    } finally {
      setDeleteConfirm(null);
    }
  }, [deleteConfirm, members]);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openResetPasswordModal = (member: User) => {
    setResetPasswordTarget(member);
    setResetPasswordInput("");
    setResetPasswordModalOpen(true);
    setMessage(null);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordTarget) return;

    const targetNim = resetPasswordTarget.nim || "NIM";
    const expectedText = `saya yakin mereset katasandi ${targetNim}`;

    if (resetPasswordInput !== expectedText) {
      setMessage({ type: "error", text: "Teks konfirmasi tidak sesuai." });
      return;
    }

    setResetPasswordLoading(true);
    try {
      await usersApi.update(resetPasswordTarget.id, { password: targetNim });
      setMessage({ type: "success", text: "Kata sandi berhasil direset." });
      setResetPasswordModalOpen(false);
      setResetPasswordTarget(null);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message || "Gagal mereset kata sandi.",
      });
    } finally {
      setResetPasswordLoading(false);
    }
  };

  // Detail modal functions
  const openDetailModal = async (member: User) => {
    setSelectedUser(member);
    setDetailModalOpen(true);
    setUserDetailLoading(true);
    setUserPayments([]);
    setUserWithdrawals([]);
    setUserSavings(null);

    try {
      // Fetch user detail
      const userResponse = await usersApi.getById(member.id);
      if (userResponse.success) {
        setSelectedUser(userResponse.data);
      }

      // Fetch user payments
      const paymentsResponse = await paymentsApi.getList({ userId: member.id });
      if (paymentsResponse.success && Array.isArray(paymentsResponse.data)) {
        setUserPayments(paymentsResponse.data);
      }

      // Fetch user withdrawals
      const withdrawalsResponse = await withdrawalsApi.getList({
        userId: member.id,
      });
      if (
        withdrawalsResponse.success &&
        Array.isArray(withdrawalsResponse.data)
      ) {
        setUserWithdrawals(withdrawalsResponse.data);
      }

      // Fetch user savings breakdown
      const savingsResponse = await savingsApi.getSavingsBreakdownByUserId(
        member.id,
      );
      if (savingsResponse.success && savingsResponse.data) {
        setUserSavings(savingsResponse.data);
      }
    } catch (error) {
      console.error("Failed to load user details:", error);
    } finally {
      setUserDetailLoading(false);
    }
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedUser(null);
    setUserPayments([]);
    setUserWithdrawals([]);
    setUserSavings(null);
  };

  // Pagination, Filtering & Sorting
  let filteredMembers = members.filter((member) => {
    // Filter Status
    if (filterStatus === "ACTIVE" && !member.isActive) return false;
    if (filterStatus === "INACTIVE" && member.isActive) return false;

    // Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      const matchesSearch =
        member.name?.toLowerCase().includes(lowerQuery) ||
        member.email?.toLowerCase().includes(lowerQuery) ||
        member.nim?.toLowerCase().includes(lowerQuery) ||
        member.phone?.toLowerCase().includes(lowerQuery) ||
        member.angkatan?.toLowerCase().includes(lowerQuery);
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Sorting
  filteredMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === "NAME_ASC") {
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sortBy === "NAME_DESC") {
      return (b.name || "").localeCompare(a.name || "");
    }
    if (sortBy === "ANGKATAN_DESC") {
      return parseInt(b.angkatan || "0") - parseInt(a.angkatan || "0");
    }
    if (sortBy === "ANGKATAN_ASC") {
      return parseInt(a.angkatan || "0") - parseInt(b.angkatan || "0");
    }
    return 0;
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  return (
    <div className="mx-auto">
      <Breadcrumb pageName="Manajemen Anggota" />

      {/* Message */}
      {message && (
        <div
          className={`mb-4 rounded-md border p-4 ${
            message.type === "success"
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-sm dark:bg-boxdark sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-semibold text-dark dark:text-white">
            Daftar Anggota
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total: {filteredMembers.length} anggota{" "}
            {searchQuery && `dari ${members.length}`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as any);
              setPage(1);
            }}
            className="dark:bg-form-input w-full rounded-lg border border-stroke bg-transparent py-2 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark sm:w-auto"
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as any);
              setPage(1);
            }}
            className="dark:bg-form-input w-full rounded-lg border border-stroke bg-transparent py-2 px-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark sm:w-auto"
          >
            <option value="">Urutkan</option>
            <option value="NAME_ASC">Nama (A-Z)</option>
            <option value="NAME_DESC">Nama (Z-A)</option>
            <option value="ANGKATAN_DESC">Angkatan (Terbaru)</option>
            <option value="ANGKATAN_ASC">Angkatan (Terlama)</option>
          </select>
          <div className="relative w-full sm:w-auto">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Cari nama, email, nim..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1); // Reset page on search
              }}
              className="dark:bg-form-input w-full rounded-lg border border-stroke bg-transparent py-2 pl-10 pr-4 outline-none focus:border-primary focus-visible:shadow-none dark:border-strokedark sm:w-64"
            />
          </div>
          <Link
            href="/admin/anggota/tunggakan"
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 sm:w-auto"
          >
            <svg
              className="mr-2 h-4 w-4"
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
            Lihat Tunggakan
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 sm:w-auto"
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Tambah Anggota
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-stroke bg-gray-50 dark:border-strokedark dark:bg-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nama
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Telepon
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Angkatan
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    <div className="flex items-center justify-center">
                      <svg
                        className="mr-2 h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Belum ada data anggota.
                  </td>
                </tr>
              ) : (
                paginatedMembers.map((member, index) => (
                  <tr
                    key={member.id}
                    className="border-b border-stroke transition hover:bg-gray-50 dark:border-strokedark dark:hover:bg-gray-700/50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {(page - 1) * itemsPerPage + index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {member.photo ? (
                          <img
                            src={getImageUrl(member.photo)}
                            alt={member.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-dark dark:text-white">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {member.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {member.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {member.angkatan}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          member.role === "ADMIN"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          member.isActive
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        <span
                          className={`mr-1 h-2 w-2 rounded-full ${
                            member.isActive ? "bg-blue-500" : "bg-red-500"
                          }`}
                        />
                        {member.isActive ? "Aktif" : "Tidak Aktif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openDetailModal(member)}
                          className="rounded-md bg-blue-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-blue-600"
                          title="Lihat Detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(member)}
                          className="rounded-md bg-yellow-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-yellow-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(member)}
                          className={`rounded-md px-3 py-1 text-xs font-medium text-white transition ${
                            member.isActive
                              ? "bg-red-500 hover:bg-red-600"
                              : "bg-blue-500 hover:bg-blue-600"
                          }`}
                        >
                          {member.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        <button
                          onClick={() => openResetPasswordModal(member)}
                          className="rounded-md bg-purple-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-purple-600"
                        >
                          Reset Sandi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-4 py-3 dark:border-strokedark">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Halaman {page} dari {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-stroke px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`rounded-md border px-3 py-1 text-sm transition ${
                    p === page
                      ? "border-primary bg-primary text-white"
                      : "border-stroke text-gray-600 hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-stroke px-3 py-1 text-sm text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-md flex-col rounded-lg bg-white shadow-xl dark:bg-boxdark">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                {editingMember ? "Edit Anggota" : "Tambah Anggota Baru"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4 dark:bg-boxdark">
              {message && (
                <div
                  className={`mb-4 rounded-md border p-3 text-sm ${
                    message.type === "success"
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                      : "border-red-300 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <form id="add-member-form" onSubmit={handleSubmit}>
                {/* Nama */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="name"
                  >
                    Nama <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    placeholder="Masukkan nama lengkap"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                    disabled={formLoading}
                    required
                  />
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="email"
                  >
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    placeholder="contoh@email.com"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                    disabled={formLoading}
                    required
                  />
                </div>

                {/* Role */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="role"
                  >
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="role"
                    value={form.role}
                    onChange={(e) => handleFormChange("role", e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
                    disabled={formLoading}
                  >
                    <option value="ANGGOTA">ANGGOTA</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                {/* Angkatan */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="angkatan"
                  >
                    Angkatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="angkatan"
                    type="text"
                    value={form.angkatan}
                    onChange={(e) =>
                      handleFormChange("angkatan", e.target.value)
                    }
                    placeholder="Contoh: 2024"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                    disabled={formLoading}
                    required
                  />
                </div>

                {/* NIM */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="nim"
                  >
                    NIM
                  </label>
                  <input
                    id="nim"
                    type="text"
                    value={form.nim}
                    onChange={(e) => handleFormChange("nim", e.target.value)}
                    placeholder="Contoh: 215410001"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
                    disabled={formLoading}
                  />
                  {form.role === "ANGGOTA" && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      ℹ️ Password default: NIM (Contoh: 215410001)
                    </p>
                  )}
                </div>

                {/* Fakultas */}
                <div className="mb-4">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="fakultas"
                  >
                    Fakultas
                  </label>
                  <select
                    id="fakultas"
                    value={form.fakultas}
                    onChange={(e) => handleFakultasChange(e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
                    disabled={formLoading || fakultasLoading}
                  >
                    <option value="">-- Pilih Fakultas --</option>
                    {fakultasList.map((fak) => (
                      <option key={fak.nama} value={fak.nama}>
                        {fak.nama}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prodi/Jurusan */}
                <div className="mb-6">
                  <label
                    className="mb-1 block text-sm font-medium text-dark dark:text-white"
                    htmlFor="prodi"
                  >
                    Prodi/Jurusan
                  </label>
                  <select
                    id="prodi"
                    value={form.prodi}
                    onChange={(e) => handleFormChange("prodi", e.target.value)}
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-boxdark dark:text-white dark:focus:border-primary"
                    disabled={
                      formLoading || !form.fakultas || prodiList.length === 0
                    }
                  >
                    <option value="">-- Pilih Prodi --</option>
                    {prodiList.map((prodi) => (
                      <option key={prodi} value={prodi}>
                        {prodi}
                      </option>
                    ))}
                  </select>
                  {form.fakultas && prodiList.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Tidak ada prodi tersedia
                    </p>
                  )}
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 border-t border-stroke px-6 py-4 dark:border-strokedark">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-stroke px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
                disabled={formLoading}
              >
                Batal
              </button>
              <button
                type="submit"
                form="add-member-form"
                disabled={formLoading}
                className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {formLoading ? (
                  <>
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Menyimpan...
                  </>
                ) : editingMember ? (
                  "Simpan Perubahan"
                ) : (
                  "Tambah Anggota"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
              Konfirmasi
            </h3>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              Apakah Anda yakin ingin{" "}
              {members.find((m) => m.id === deleteConfirm)?.isActive
                ? "menonaktifkan"
                : "mengaktifkan"}{" "}
              anggota{" "}
              <strong>
                {members.find((m) => m.id === deleteConfirm)?.name}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="rounded-lg border border-stroke px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Batal
              </button>
              <button
                onClick={confirmToggleStatus}
                className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600"
              >
                Ya, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl dark:bg-boxdark">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-strokedark">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Detail Anggota
              </h3>
              <button
                onClick={closeDetailModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
              {userDetailLoading ? (
                <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                  <svg
                    className="mr-2 h-5 w-5 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Memuat detail...
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Profile Section */}
                  <div className="rounded-lg border border-stroke p-6 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-dark dark:text-white">
                      Informasi Profil
                    </h4>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                      {/* Avatar */}
                      <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {selectedUser.photo ? (
                          <img
                            src={getImageUrl(selectedUser.photo)}
                            alt={selectedUser.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-10 w-10 text-primary" />
                        )}
                      </div>
                      {/* Info Grid */}
                      <div className="flex-1">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Nama Lengkap
                            </p>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {selectedUser.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Email
                            </p>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {selectedUser.email}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Nomor Handphone
                            </p>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {selectedUser.phone || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Alamat Lengkap
                            </p>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {selectedUser.address || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              NIM
                            </p>
                            <p className="text-sm font-medium text-dark dark:text-white">
                              {selectedUser.nim || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Additional Info */}
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-stroke pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Fakultas
                        </p>
                        <p className="text-sm font-medium text-dark dark:text-white">
                          {selectedUser.fakultas || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Prodi/Jurusan
                        </p>
                        <p className="text-sm font-medium text-dark dark:text-white">
                          {selectedUser.prodi || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Angkatan
                        </p>
                        <p className="text-sm font-medium text-dark dark:text-white">
                          {selectedUser.angkatan}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Role
                        </p>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            selectedUser.role === "ADMIN"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {selectedUser.role}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Status
                        </p>
                        <span
                          className={`mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            selectedUser.isActive
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          <span
                            className={`mr-1.5 h-2 w-2 rounded-full ${selectedUser.isActive ? "bg-blue-500" : "bg-red-500"}`}
                          />
                          {selectedUser.isActive ? "Aktif" : "Tidak Aktif"}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Terdaftar Sejak
                        </p>
                        <p className="text-sm font-medium text-dark dark:text-white">
                          {new Date(selectedUser.createdAt).toLocaleDateString(
                            "id-ID",
                            { day: "numeric", month: "long", year: "numeric" },
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="rounded-lg border border-stroke p-6 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-dark dark:text-white">
                      Ringkasan Keuangan
                    </h4>
                    {(() => {
                      const approvedPayments = userPayments.filter(
                        (p) => p.status === "APPROVED",
                      );
                      const approvedWithdrawals = userWithdrawals.filter(
                        (w) => w.status === "APPROVED",
                      );
                      const totalPemasukan = approvedPayments.reduce(
                        (sum, p) => sum + Number(p.nominal),
                        0,
                      );
                      const totalPengeluaran = approvedWithdrawals.reduce(
                        (sum, w) => sum + Number(w.nominal),
                        0,
                      );
                      const totalSaldo = totalPemasukan - totalPengeluaran;

                      const formatRupiah = (num: number) =>
                        "Rp " + new Intl.NumberFormat("id-ID").format(num);

                      return (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                            <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                              Total Pemasukan
                            </p>
                            <p className="mt-1 text-lg font-bold text-blue-700 dark:text-blue-400">
                              {formatRupiah(totalPemasukan)}
                            </p>
                            <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                              {approvedPayments.length} transaksi
                            </p>
                          </div>
                          <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                            <p className="text-xs font-medium text-red-600 dark:text-red-400">
                              Total Pengeluaran
                            </p>
                            <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400">
                              {formatRupiah(totalPengeluaran)}
                            </p>
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                              {approvedWithdrawals.length} transaksi
                            </p>
                          </div>
                          <div className="rounded-lg border border-primary bg-primary/10 p-4 dark:border-primary/50 dark:bg-primary/10">
                            <p className="text-xs font-medium text-primary dark:text-primary">
                              Total Saldo
                            </p>
                            <p className="mt-1 text-lg font-bold text-primary dark:text-primary">
                              {formatRupiah(totalSaldo)}
                            </p>
                            <p className="mt-1 text-xs text-primary/80 dark:text-primary/80">
                              Sisa saldo simpanan
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    {userSavings && userSavings.details && (
                      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-stroke pt-4 dark:border-strokedark sm:grid-cols-3">
                        {userSavings.details.map((detail, idx) => (
                          <div
                            key={idx}
                            className="rounded-lg border border-stroke p-3 dark:border-strokedark"
                          >
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {detail.type}
                            </p>
                            <p className="mt-1 text-base font-semibold text-dark dark:text-white">
                              Rp{" "}
                              {new Intl.NumberFormat("id-ID").format(
                                detail.amount,
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payment History */}
                  <div className="rounded-lg border border-stroke p-6 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-dark dark:text-white">
                      Riwayat Pembayaran
                    </h4>
                    {userPayments.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Tidak ada riwayat pembayaran.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="border-b border-stroke bg-gray-50 dark:bg-gray-800">
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Tanggal
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Jumlah
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {userPayments.slice(0, 5).map((payment) => (
                              <tr
                                key={payment.id}
                                className="border-b border-stroke dark:border-strokedark"
                              >
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(
                                    payment.createdAt,
                                  ).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-dark dark:text-white">
                                  Rp{" "}
                                  {new Intl.NumberFormat("id-ID").format(
                                    Number(payment.nominal),
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      payment.status === "APPROVED"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : payment.status === "REJECTED"
                                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                  >
                                    {payment.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {userPayments.length > 5 && (
                          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan 5 dari {userPayments.length} pembayaran
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Withdrawal History */}
                  <div className="rounded-lg border border-stroke p-6 dark:border-strokedark">
                    <h4 className="mb-4 text-base font-semibold text-dark dark:text-white">
                      Riwayat Penarikan
                    </h4>
                    {userWithdrawals.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        Tidak ada riwayat penarikan.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                          <thead>
                            <tr className="border-b border-stroke bg-gray-50 dark:bg-gray-800">
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Tanggal
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Jumlah
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {userWithdrawals.slice(0, 5).map((withdrawal) => (
                              <tr
                                key={withdrawal.id}
                                className="border-b border-stroke dark:border-strokedark"
                              >
                                <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                                  {new Date(
                                    withdrawal.createdAt,
                                  ).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </td>
                                <td className="px-3 py-2 text-sm font-medium text-dark dark:text-white">
                                  Rp{" "}
                                  {new Intl.NumberFormat("id-ID").format(
                                    Number(withdrawal.nominal),
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                      withdrawal.status === "APPROVED"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        : withdrawal.status === "REJECTED"
                                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}
                                  >
                                    {withdrawal.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {userWithdrawals.length > 5 && (
                          <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
                            Menampilkan 5 dari {userWithdrawals.length}{" "}
                            penarikan
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-stroke px-6 py-4 dark:border-strokedark">
              <button
                type="button"
                onClick={closeDetailModal}
                className="rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordModalOpen && resetPasswordTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-boxdark">
            <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
              Reset Kata Sandi
            </h3>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Anda akan mereset kata sandi untuk anggota{" "}
              <strong>{resetPasswordTarget.name}</strong>. Kata sandi baru akan
              diatur menjadi:{" "}
              <strong>{resetPasswordTarget.nim || "NIM"}</strong>.
            </p>
            <div className="mb-6 rounded-md bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
              Ketik kalimat berikut untuk mengonfirmasi: <br />
              <span className="mt-1 block select-all font-mono font-bold">
                saya yakin mereset katasandi {resetPasswordTarget.nim || "NIM"}
              </span>
            </div>
            <input
              type="text"
              value={resetPasswordInput}
              onChange={(e) => setResetPasswordInput(e.target.value)}
              placeholder="Ketik teks konfirmasi di atas"
              className="mb-6 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:text-white dark:focus:border-primary"
              disabled={resetPasswordLoading}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setResetPasswordModalOpen(false);
                  setResetPasswordTarget(null);
                }}
                className="rounded-lg border border-stroke px-4 py-2 font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:text-gray-400 dark:hover:bg-gray-700"
                disabled={resetPasswordLoading}
              >
                Batal
              </button>
              <button
                onClick={handleResetPassword}
                disabled={
                  resetPasswordLoading ||
                  resetPasswordInput !==
                    `saya yakin mereset katasandi ${resetPasswordTarget.nim || "NIM"}`
                }
                className="rounded-lg bg-red-500 px-4 py-2 font-medium text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetPasswordLoading ? "Mereset..." : "Reset Kata Sandi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
