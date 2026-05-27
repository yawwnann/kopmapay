"use client";

import { useState, useEffect } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import Link from "next/link";
import { usersApi, savingsApi, adminTransactionsApi } from "@/lib/api";
import {
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  ChevronDown,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  angkatan: string;
  avatar: string;
  totalSavings?: number;
}

interface SavingsBreakdown {
  Pokok: number;
  Wajib: number;
  Sukarela: number;
}

export default function TransaksiAdminPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <TransaksiAdminContent />
    </ProtectedRoute>
  );
}

function TransaksiAdminContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSavings, setUserSavings] = useState<SavingsBreakdown | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Transaction form state
  const [transactionType, setTransactionType] = useState<"income" | "withdrawal">("income");
  const [nominal, setNominal] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [savingType, setSavingType] = useState("Sukarela");
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await usersApi.getList();
      if (response.success && Array.isArray(response.data)) {
        const transformedUsers = response.data
          .filter((u: any) => u.role === "ANGGOTA" && u.isActive)
          .map((user: any) => ({
            id: user.id,
            name: user.name || "Unknown",
            email: user.email || "-",
            angkatan: user.angkatan || "-",
            avatar: (user.name || "U").charAt(0).toUpperCase(),
          }));
        setUsers(transformedUsers);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserSavings(userId: string) {
    try {
      const response = await savingsApi.getSavingsBreakdownByUserId(userId);
      if (response.success && response.data) {
        const data = response.data;
        // Backend returns lowercase keys (pokok, wajib, sukarela), convert to PascalCase
        setUserSavings({
          Pokok: data.breakdown?.pokok || 0,
          Wajib: data.breakdown?.wajib || 0,
          Sukarela: data.breakdown?.sukarela || 0,
        });
      }
    } catch (error) {
      console.error("Failed to load savings:", error);
      setUserSavings(null);
    }
  }

  const handleSelectUser = async (user: User) => {
    setSelectedUser(user);
    setShowUserDropdown(false);
    await loadUserSavings(user.id);
    // Reset form
    setNominal("");
    setDescription("");
    setReason("");
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!selectedUser || !nominal) {
      setMessage({ type: "error", text: "Pilih anggota dan masukkan nominal." });
      return;
    }

    const parsedNominal = parseFloat(nominal);
    if (isNaN(parsedNominal) || parsedNominal <= 0) {
      setMessage({ type: "error", text: "Nominal harus lebih dari 0." });
      return;
    }

    if (transactionType === "withdrawal" && !reason) {
      setMessage({ type: "error", text: "Masukkan alasan penarikan." });
      return;
    }

    setShowModal(true);
  };

  const confirmTransaction = async () => {
    if (!selectedUser) return;

    setProcessing(true);
    setMessage(null);

    try {
      const parsedNominal = parseFloat(nominal);

      if (transactionType === "income") {
        const response = await adminTransactionsApi.addIncome({
          userId: selectedUser.id,
          nominal: parsedNominal,
          description: description,
          paymentMethod: paymentMethod,
        });

        if (response.success) {
          setMessage({ type: "success", text: `Berhasil menambahkan saldo Rp${parsedNominal.toLocaleString("id-ID")} ke ${selectedUser.name}.` });
          // Refresh savings
          await loadUserSavings(selectedUser.id);
        } else {
          setMessage({ type: "error", text: response.message || "Gagal menambahkan saldo." });
        }
      } else {
        const response = await adminTransactionsApi.addWithdrawal({
          userId: selectedUser.id,
          nominal: parsedNominal,
          reason: reason,
          savingType: savingType,
          paymentMethod: paymentMethod,
        });

        if (response.success) {
          setMessage({ type: "success", text: `Berhasil menarik saldo Rp${parsedNominal.toLocaleString("id-ID")} dari ${selectedUser.name}.` });
          // Refresh savings
          await loadUserSavings(selectedUser.id);
        } else {
          setMessage({ type: "error", text: response.message || "Gagal menarik saldo." });
        }
      }

      // Reset form
      setNominal("");
      setDescription("");
      setReason("");
      setShowModal(false);
    } catch (error: any) {
      console.error("Transaction failed:", error);
      setMessage({ type: "error", text: error.message || "Terjadi kesalahan." });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === undefined || amount === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.angkatan.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Transaksi Manual
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Tambah pemasukan atau penarikan saldo anggota secara langsung
          </p>
        </div>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-gray-500 hover:text-primary dark:text-gray-400">
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-primary">Transaksi Manual</span>
        </nav>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Transaction Form */}
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-6 text-lg font-semibold text-dark dark:text-white">
            Form Transaksi
          </h3>

          {/* Transaction Type Toggle */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setTransactionType("income")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition ${
                  transactionType === "income"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-stroke text-gray-600 hover:border-primary/50 dark:border-strokedark dark:text-gray-400"
                }`}
              >
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">Pemasukan</span>
              </button>
              <button
                type="button"
                onClick={() => setTransactionType("withdrawal")}
                className={`flex items-center justify-center gap-2 rounded-lg border-2 p-3 transition ${
                  transactionType === "withdrawal"
                    ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-900/20"
                    : "border-stroke text-gray-600 hover:border-red-500/50 dark:border-strokedark dark:text-gray-400"
                }`}
              >
                <TrendingDown className="h-5 w-5" />
                <span className="font-medium">Penarikan</span>
              </button>
            </div>
          </div>

          {/* User Selection */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Pilih Anggota <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex w-full items-center justify-between rounded-lg border border-stroke bg-white px-4 py-3 text-left text-dark transition hover:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
              >
                <div className="flex items-center gap-3">
                  {selectedUser ? (
                    <>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {selectedUser.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{selectedUser.name}</p>
                        <p className="text-xs text-gray-500">{selectedUser.email}</p>
                      </div>
                    </>
                  ) : (
                    <span className="text-gray-400">-- Pilih Anggota --</span>
                  )}
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute z-20 mt-2 w-full rounded-lg border border-stroke bg-white shadow-lg dark:border-strokedark dark:bg-boxdark">
                  <div className="border-b border-stroke p-3 dark:border-strokedark">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Cari anggota..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {loading ? (
                      <div className="p-4 text-center text-gray-500">
                        Memuat...
                      </div>
                    ) : filteredUsers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Tidak ada anggota ditemukan
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectUser(user)}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                            {user.avatar}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-dark dark:text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email} • {user.angkatan}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nominal */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Nominal (Rp) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={nominal}
              onChange={(e) => setNominal(e.target.value)}
              placeholder="Masukkan nominal"
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Description for Income */}
          {transactionType === "income" && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Keterangan / Jenis Simpanan
              </label>
              <select
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
              >
                <option value="">-- Pilih Jenis --</option>
                <option value="Simpanan Pokok">Simpanan Pokok</option>
                <option value="Simpanan Wajib">Simpanan Wajib</option>
                <option value="Simpanan Sukarela">Simpanan Sukarela</option>
                <option value="Tabungan">Tabungan</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>
          )}

          {/* Reason for Withdrawal */}
          {transactionType === "withdrawal" && (
            <>
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Alasan Penarikan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Masukkan alasan penarikan"
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
                />
              </div>

              {/* Saving Type */}
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Jenis Simpanan yang Ditarik
                </label>
                <select
                  value={savingType}
                  onChange={(e) => setSavingType(e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
                >
                  <option value="Sukarela">Simpanan Sukarela</option>
                  <option value="Wajib">Simpanan Wajib</option>
                  <option value="Pokok">Simpanan Pokok</option>
                  <option value="Semua">Semua Jenis</option>
                </select>
              </div>
            </>
          )}

          {/* Payment Method */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Metode Pembayaran
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-white px-4 py-3 text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white"
            >
              <option value="Cash">Tunai (Cash)</option>
              <option value="QRIS">QRIS</option>
              <option value="BankTransfer">Transfer Bank</option>
            </select>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-4 flex items-center gap-2 rounded-lg p-3 ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                  : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedUser || !nominal || processing}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            {processing ? "Memproses..." : "Proses Transaksi"}
          </button>
        </div>

        {/* Right: User Info & Savings */}
        <div className="rounded-xl border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
          <h3 className="mb-6 text-lg font-semibold text-dark dark:text-white">
            Info Anggota
          </h3>

          {selectedUser ? (
            <>
              {/* User Card */}
              <div className="mb-6 flex items-center gap-4 rounded-lg border border-stroke p-4 dark:border-strokedark">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {selectedUser.avatar}
                </div>
                <div>
                  <p className="text-lg font-semibold text-dark dark:text-white">
                    {selectedUser.name}
                  </p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  <p className="text-xs text-gray-400">Angkatan {selectedUser.angkatan}</p>
                </div>
              </div>

              {/* Savings Breakdown */}
              {userSavings ? (
                <div>
                  <h4 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-400">
                    Rincian Simpanan
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Simpanan Pokok
                      </span>
                      <span className="font-semibold text-dark dark:text-white">
                        {formatCurrency(userSavings.Pokok || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Simpanan Wajib
                      </span>
                      <span className="font-semibold text-dark dark:text-white">
                        {formatCurrency(userSavings.Wajib || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Simpanan Sukarela
                      </span>
                      <span className="font-semibold text-dark dark:text-white">
                        {formatCurrency(userSavings.Sukarela || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-primary/50 bg-primary/5 p-3 dark:border-primary/30">
                      <span className="font-medium text-primary">Total Saldo</span>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(
                          (userSavings.Pokok || 0) +
                            (userSavings.Wajib || 0) +
                            (userSavings.Sukarela || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-stroke p-4 text-center text-gray-500 dark:border-strokedark">
                  Memuat data simpanan...
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
              <div className="mb-2 rounded-full bg-gray-100 p-4 dark:bg-gray-800">
                <Search className="h-8 w-8 text-gray-400" />
              </div>
              <p className="font-medium text-gray-500">Pilih anggota terlebih dahulu</p>
              <p className="mt-1 text-sm text-gray-400">
                Informasi simpanan akan ditampilkan di sini
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-boxdark">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark dark:text-white">
                Konfirmasi Transaksi
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                <span className="text-sm text-gray-600 dark:text-gray-400">Anggota</span>
                <span className="font-medium text-dark dark:text-white">{selectedUser?.name}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                <span className="text-sm text-gray-600 dark:text-gray-400">Jenis</span>
                <span className={`font-medium ${transactionType === "income" ? "text-green-600" : "text-red-600"}`}>
                  {transactionType === "income" ? "Pemasukan" : "Penarikan"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                <span className="text-sm text-gray-600 dark:text-gray-400">Nominal</span>
                <span className="font-bold text-primary">
                  {formatCurrency(parseFloat(nominal) || 0)}
                </span>
              </div>
              {transactionType === "income" && description && (
                <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Keterangan</span>
                  <span className="text-sm text-dark dark:text-white">{description}</span>
                </div>
              )}
              {transactionType === "withdrawal" && reason && (
                <div className="flex items-center justify-between rounded-lg border border-stroke p-3 dark:border-strokedark">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Alasan</span>
                  <span className="text-sm text-dark dark:text-white">{reason}</span>
                </div>
              )}
            </div>

            <p className="mb-6 text-sm text-gray-500">
              Pastikan data sudah benar. Transaksi akan langsung diproses dan saldo akan{' '}
              {transactionType === "income" ? "ditambahkan" : "ditarik"} secara instan.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-stroke px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50 dark:border-strokedark dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmTransaction}
                disabled={processing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? "Memproses..." : "Konfirmasi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}