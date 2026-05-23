"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { usersApi, savingsApi } from "@/lib/api";
import { getImageUrl } from "@/lib/getImageUrl";
import { formatCurrency, formatDate } from "@/lib/api-helpers";
import type {
  User,
  MandatorySavingRecord,
  VoluntarySavingRecord,
  SavingsHistoryResponse,
} from "@/types/api.types";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Wallet,
  X,
  Calendar,
  TrendingUp,
  Landmark,
  FileText,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  History,
} from "lucide-react";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

// ─── Skeleton Components ────────────────────────────────
function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-stroke bg-white p-5 dark:border-strokedark dark:bg-boxdark animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-3 h-7 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 border-b border-stroke px-4 py-3 dark:border-strokedark">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`h-4 rounded bg-gray-200 dark:bg-gray-700 ${i === 2 ? "ml-auto w-20" : i === 0 ? "w-10" : "flex-1"}`} />
      ))}
    </div>
  );
}

export default function RiwayatSimpananPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <RiwayatSimpananContent />
    </ProtectedRoute>
  );
}

function RiwayatSimpananContent() {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [historyLoading, setHistoryLoading] = useState(false);
  const [mandatorySavings, setMandatorySavings] = useState<MandatorySavingRecord[]>([]);
  const [voluntarySavings, setVoluntarySavings] = useState<VoluntarySavingRecord[]>([]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── Load members on mount ────────────────────────────
  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ─── Dropdown open state (controlled locally) ─────────
  const [dropdownOpen, setDropdownOpen] = useState(false);

  async function loadMembers() {
    setLoading(true);
    try {
      const response = await usersApi.getList();
      if (response.success && Array.isArray(response.data)) {
        setMembers(response.data.filter((u: User) => u.role === "ANGGOTA"));
      }
    } catch (error) {
      console.error("Failed to load members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(userId: string) {
    setHistoryLoading(true);
    try {
      const response = await savingsApi.getSavingsHistory(userId);
      if (response.success && response.data) {
        const data = response.data as SavingsHistoryResponse;
        setMandatorySavings(data.mandatorySavings || []);
        setVoluntarySavings(data.voluntarySavings || []);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleMemberSelect(user: User) {
    setSelectedUserId(user.id);
    setSelectedUser(user);
    setSearchQuery("");
    setDropdownOpen(false);
    setPage(1);
    loadHistory(user.id);
  }

  function clearSelection() {
    setSelectedUserId("");
    setSelectedUser(null);
    setMandatorySavings([]);
    setVoluntarySavings([]);
    setPage(1);
    inputRef.current?.focus();
  }

  // ─── Derived: filtered members ────────────────────────
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter((m) =>
      m.name?.toLowerCase().includes(q) ||
      m.email?.toLowerCase().includes(q) ||
      m.nim?.toLowerCase().includes(q) ||
      m.angkatan?.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  // ─── Derived: grouped mandatory savings by year ───────
  const groupedMandatory = useMemo(() => {
    return mandatorySavings.reduce<Record<number, MandatorySavingRecord[]>>(
      (acc, ms) => {
        if (!acc[ms.year]) acc[ms.year] = [];
        acc[ms.year].push(ms);
        return acc;
      },
      {}
    );
  }, [mandatorySavings]);

  const sortedYears = useMemo(
    () => Object.keys(groupedMandatory).map(Number).sort((a, b) => b - a),
    [groupedMandatory]
  );

  // ─── Derived: totals ──────────────────────────────────
  const wajibTotal = useMemo(
    () => mandatorySavings.reduce((sum, ms) => sum + ms.nominal, 0),
    [mandatorySavings]
  );

  const sukarelaTotal = useMemo(
    () => voluntarySavings.reduce((sum, vs) => sum + vs.nominal, 0),
    [voluntarySavings]
  );

  const grandTotal = wajibTotal + sukarelaTotal;

  // ─── Derived: paginated voluntary with saldo ──────────
  const voluntaryWithSaldo = useMemo(() => {
    let currentBalance = sukarelaTotal;
    return voluntarySavings.map(vs => {
      const saldo = currentBalance;
      currentBalance -= vs.nominal;
      return { ...vs, saldo };
    });
  }, [voluntarySavings, sukarelaTotal]);

  const totalVoluntaryPages = Math.ceil(voluntaryWithSaldo.length / itemsPerPage);
  const paginatedVoluntary = useMemo(
    () => voluntaryWithSaldo.slice((page - 1) * itemsPerPage, page * itemsPerPage),
    [voluntaryWithSaldo, page]
  );

  // ─── Derived: current year overview ──────────────────
  const thisYear = new Date().getFullYear();
  const wajibThisYear = mandatorySavings
    .filter((ms) => ms.year === thisYear)
    .reduce((sum, ms) => sum + ms.nominal, 0);
  const wajibMonthsThisYear = mandatorySavings.filter(
    (ms) => ms.year === thisYear && ms.status === "PAID"
  ).length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Riwayat Simpanan Anggota
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lihat riwayat simpanan wajib dan sukarela per anggota
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
          <span className="font-medium text-primary">Riwayat Simpanan</span>
        </nav>
      </div>

      {/* ── Member Selector Card ──────────────────────── */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
        <div className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              Pilih Anggota
            </h3>
            {selectedUser && (
              <button
                onClick={clearSelection}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-gray-100 dark:border-strokedark dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Pilih Anggota Lain
              </button>
            )}
          </div>

          {selectedUser ? (
            /* ── Selected User Banner ─────────────────── */
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-primary/[0.02] px-5 py-4 dark:border-primary/40 dark:from-primary/10 dark:to-primary/[0.05]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-primary/20 bg-primary/10">
                {selectedUser.photo ? (
                  <img
                    src={getImageUrl(selectedUser.photo)}
                    alt={selectedUser.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <UserIcon className="h-6 w-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-dark dark:text-white truncate">
                  {selectedUser.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedUser.nim || "NIM: -"} &middot;{" "}
                  {selectedUser.fakultas || "Fakultas -"} &middot; Angkatan{" "}
                  {selectedUser.angkatan || "-"}
                </p>
              </div>
              <button
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-lg border border-stroke bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600 dark:border-strokedark dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                <X className="h-3.5 w-3.5" />
                Ganti
              </button>
            </div>
          ) : (
            /* ── Search / Dropdown ────────────────────── */
            <div className="mt-4 relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Cari nama, NIM, email, atau angkatan..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  className="w-full rounded-lg border border-stroke bg-white py-3 pl-11 pr-11 text-sm text-dark outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary dark:focus:ring-primary"
                />
                <ChevronDown
                  className={`absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </div>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-stroke bg-white shadow-xl dark:border-strokedark dark:bg-gray-800">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Memuat data anggota...
                    </div>
                  ) : filteredMembers.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      {searchQuery ? "Anggota tidak ditemukan" : "Tidak ada anggota"}
                    </div>
                  ) : (
                    <>
                      {filteredMembers.slice(0, 50).map((member) => (
                        <button
                          key={member.id}
                          onClick={() => handleMemberSelect(member)}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-primary/5 dark:hover:bg-primary/10"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                            {member.photo ? (
                              <img
                                src={getImageUrl(member.photo)}
                                alt={member.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserIcon className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-dark dark:text-white truncate">
                              {member.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {member.nim || "NIM: -"} &middot;{" "}
                              {member.email}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                            {member.angkatan}
                          </span>
                        </button>
                      ))}
                      {filteredMembers.length > 50 && (
                        <div className="border-t border-stroke px-4 py-2 text-center text-xs text-gray-400 dark:border-strokedark dark:text-gray-500">
                          Menampilkan 50 dari {filteredMembers.length} anggota.
                          Persempit pencarian untuk melihat lebih banyak.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty State ────────────────────────────────── */}
      {!selectedUserId && !loading && (
        <div className="rounded-xl border border-dashed border-stroke bg-white p-16 text-center dark:border-strokedark dark:bg-boxdark">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <History className="h-7 w-7 text-primary" />
          </div>
          <p className="text-lg font-semibold text-dark dark:text-white">
            Pilih Anggota untuk Melihat Riwayat
          </p>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Gunakan kolom pencarian di atas untuk mencari dan memilih anggota.
            Riwayat simpanan wajib dan sukarela akan ditampilkan di sini.
          </p>
        </div>
      )}

      {/* ── Loading skeleton for user list ─────────────── */}
      {loading && (
        <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Selected User Content ──────────────────────── */}
      {selectedUser && (
        <div className="space-y-6">
          {/* ── Summary Stats Cards ────────────────────── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {historyLoading ? (
              <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </>
            ) : (
              <>
                {/* Total Simpanan Wajib */}
                <div className="group rounded-xl border border-blue-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-blue-900/40 dark:bg-boxdark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Total Simpanan Wajib
                      </p>
                      <p className="mt-2 text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(wajibTotal)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {mandatorySavings.length} bulan tercatat
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 transition-colors group-hover:bg-blue-100 dark:bg-blue-900/30 dark:group-hover:bg-blue-900/50">
                      <Landmark className="h-5 w-5 text-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Total Simpanan Sukarela */}
                <div className="group rounded-xl border border-green-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-green-900/40 dark:bg-boxdark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Total Simpanan Sukarela
                      </p>
                      <p className="mt-2 text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(sukarelaTotal)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {voluntarySavings.length} transaksi
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-50 transition-colors group-hover:bg-green-100 dark:bg-green-900/30 dark:group-hover:bg-green-900/50">
                      <Wallet className="h-5 w-5 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Total Keseluruhan */}
                <div className="group rounded-xl border border-primary/30 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-primary/40 dark:bg-boxdark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Total Keseluruhan
                      </p>
                      <p className="mt-2 text-xl font-bold text-primary">
                        {formatCurrency(grandTotal)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        Saldo terakumulasi
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15 dark:bg-primary/20 dark:group-hover:bg-primary/30">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                {/* Tahun Berjalan */}
                <div className="group rounded-xl border border-orange-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-orange-900/40 dark:bg-boxdark">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Simpanan {thisYear}
                      </p>
                      <p className="mt-2 text-xl font-bold text-orange-600 dark:text-orange-400">
                        {formatCurrency(wajibThisYear)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        {wajibMonthsThisYear} bulan lunas
                      </p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 transition-colors group-hover:bg-orange-100 dark:bg-orange-900/30 dark:group-hover:bg-orange-900/50">
                      <Calendar className="h-5 w-5 text-orange-500" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Simpanan Wajib ─────────────────────────── */}
          <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
            {/* Card Header */}
            <div className="flex flex-col gap-3 border-b border-stroke p-5 sm:flex-row sm:items-center sm:justify-between dark:border-strokedark">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                  <Landmark className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-dark dark:text-white">
                    Simpanan Wajib
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {mandatorySavings.length > 0
                      ? `${mandatorySavings.length} bulan tercatat — Total ${formatCurrency(wajibTotal)}`
                      : "Belum ada data simpanan wajib"}
                  </p>
                </div>
              </div>
              {mandatorySavings.length > 0 && (
                <span className="self-start sm:self-auto shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  {sortedYears.length} tahun
                </span>
              )}
            </div>

            {/* Table */}
            {historyLoading ? (
              <div className="p-6">
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </div>
              </div>
            ) : mandatorySavings.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <FileText className="h-6 w-6 text-blue-300 dark:text-blue-700" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Belum ada riwayat simpanan wajib
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Data akan muncul setelah anggota melakukan pembayaran simpanan wajib
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-stroke bg-gray-50/80 dark:border-strokedark dark:bg-gray-800/60">
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Tahun
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Bulan
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Nominal
                      </th>
                      <th className="px-4 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Tanggal Bayar
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {sortedYears.map((year, yearIdx) =>
                      groupedMandatory[year].map((ms, idx) => (
                        <tr
                          key={ms.id}
                          className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                        >
                          {/* Year — merged cell on first row of year */}
                          {idx === 0 && (
                            <td
                              rowSpan={groupedMandatory[year].length}
                              className="px-4 py-3 align-top"
                            >
                              <div className="flex flex-col items-start gap-0.5">
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {year}
                                </span>
                                {idx === 0 && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {groupedMandatory[year].length} bulan
                                  </span>
                                )}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">
                              {MONTH_NAMES[ms.month - 1]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                            {formatCurrency(ms.nominal)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                ms.status === "PAID"
                                  ? "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800"
                                  : "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800"
                              }`}
                            >
                              <ArrowUpCircle
                                className={`h-3 w-3 ${
                                  ms.status === "PAID" ? "" : "opacity-50"
                                }`}
                              />
                              {ms.status === "PAID" ? "Lunas" : "Belum"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              {ms.paidAt
                                ? formatDate(ms.paidAt)
                                : "—"}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {/* Table Footer — Year Totals */}
                  <tfoot>
                    <tr className="border-t-2 border-stroke bg-gray-50 dark:border-strokedark dark:bg-gray-800/80">
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                      >
                        Total Wajib
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(wajibTotal)}
                      </td>
                      <td
                        colSpan={2}
                        className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400"
                      >
                        {mandatorySavings.filter((s) => s.status === "PAID").length} / {mandatorySavings.length} bulan lunas
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* ── Simpanan Sukarela ───────────────────────── */}
          <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
            {/* Card Header */}
            <div className="flex flex-col gap-3 border-b border-stroke p-5 sm:flex-row sm:items-center sm:justify-between dark:border-strokedark">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 dark:bg-green-900/30">
                  <Wallet className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-dark dark:text-white">
                    Simpanan Sukarela
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {voluntarySavings.length > 0
                      ? `${voluntarySavings.length} transaksi — Total ${formatCurrency(sukarelaTotal)}`
                      : "Belum ada data simpanan sukarela"}
                  </p>
                </div>
              </div>
              {voluntarySavings.length > itemsPerPage && (
                <span className="self-start sm:self-auto shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-600 dark:bg-green-900/30 dark:text-green-400">
                  {voluntarySavings.length} transaksi
                </span>
              )}
            </div>

            {/* Content */}
            {historyLoading ? (
              <div className="p-6">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-14 rounded-lg bg-gray-50 dark:bg-gray-800 animate-pulse"
                    />
                  ))}
                </div>
              </div>
            ) : voluntarySavings.length === 0 ? (
              <div className="py-14 px-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                  <Wallet className="h-6 w-6 text-green-300 dark:text-green-700" />
                </div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Belum ada riwayat simpanan sukarela
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Data akan muncul setelah anggota melakukan pembayaran simpanan sukarela
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-stroke bg-gray-50/80 dark:border-strokedark dark:bg-gray-800/60">
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Tanggal
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Nominal
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Jenis
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Keterangan
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Saldo
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stroke dark:divide-strokedark">
                      {paginatedVoluntary.map((vs, idx) => (
                        <tr
                          key={vs.id}
                          className={`transition-colors hover:bg-green-50/50 dark:hover:bg-green-900/10 ${
                            idx % 2 === 0
                              ? "bg-white dark:bg-boxdark"
                              : "bg-gray-50/50 dark:bg-gray-800/30"
                          }`}
                        >
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
                              {formatDate(vs.payment?.createdAt || vs.createdAt)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-semibold text-dark dark:text-white">
                            <span className={vs.nominal < 0 ? "text-red-500" : "text-green-500"}>
                              {vs.nominal < 0 ? "- " : "+ "}{formatCurrency(Math.abs(vs.nominal))}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {vs.nominal < 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-inset ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800">
                                <ArrowDownCircle className="h-3 w-3" />
                                Penarikan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-600 ring-1 ring-inset ring-green-200 dark:bg-green-900/30 dark:text-green-400 dark:ring-green-800">
                                <ArrowUpCircle className="h-3 w-3" />
                                Simpanan
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {vs.payment?.paymentMethod || "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-dark dark:text-white">
                            {formatCurrency(vs.saldo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {/* Table Footer — Voluntary Total */}
                    <tfoot>
                      <tr className="border-t-2 border-stroke bg-green-50/50 dark:border-strokedark dark:bg-green-900/10">
                        <td
                          colSpan={1}
                          className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                        >
                          Total Sukarela
                        </td>
                        <td
                          colSpan={4}
                          className="px-4 py-3 text-right text-sm font-bold text-green-600 dark:text-green-400"
                        >
                          {formatCurrency(sukarelaTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pagination */}
                {totalVoluntaryPages > 1 && (
                  <div className="flex flex-col gap-3 border-t border-stroke px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-strokedark">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Halaman {page} dari {totalVoluntaryPages} —{" "}
                      {voluntarySavings.length} transaksi
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Sebelumnya
                      </button>
                      <div className="mx-1 flex items-center gap-1">
                        {Array.from({ length: Math.min(totalVoluntaryPages, 5) }, (_, i) => {
                          let pageNum = Math.max(1, Math.min(page - 2, totalVoluntaryPages - 4)) + i;
                          if (pageNum > totalVoluntaryPages) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                                pageNum === page
                                  ? "bg-primary text-white"
                                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => setPage((p) => Math.min(totalVoluntaryPages, p + 1))}
                        disabled={page === totalVoluntaryPages}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        Selanjutnya
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
