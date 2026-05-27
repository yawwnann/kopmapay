"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ProtectedRoute } from "@/components/protected-route";
import { savingsApi } from "@/lib/api";
import {
  Users,
  Wallet,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  FileSpreadsheet,
} from "lucide-react";

interface SavingRow {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  email: string;
  angkatan: string;
  total: number;
  updatedAt?: string;
}

export default function KeuanganPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      <KeuanganContent />
    </ProtectedRoute>
  );
}

function KeuanganContent() {
  const [savings, setSavings] = useState<SavingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [exportingType, setExportingType] = useState<"pdf" | "excel" | null>(
    null,
  );
  const itemsPerPage = 10;

  useEffect(() => {
    loadSavings();
  }, []);

  async function loadSavings() {
    setLoading(true);
    try {
      const response = await savingsApi.getAllSavings();
      if (response.success && Array.isArray(response.data)) {
        const transformedSavings = response.data.map((item: any) => {
          // Handle Prisma Decimal object
          const totalAmount = item.total?.toString ? Number(item.total.toString()) : Number(item.total);
          return {
            id: item.id,
            userId: item.userId,
            userName: item.user?.name || "Unknown",
            userAvatar: item.user?.name?.charAt(0).toUpperCase() || "U",
            email: item.user?.email || "-",
            angkatan: item.user?.angkatan || "-",
            total: totalAmount || 0,
            updatedAt: item.updatedAt,
          };
        });
        setSavings(transformedSavings);
      }
    } catch (error) {
      console.error("Failed to load savings:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredSavings = savings.filter(
    (s) =>
      s.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.angkatan.includes(searchTerm),
  );

  const totalPages = Math.ceil(filteredSavings.length / itemsPerPage);
  const paginatedSavings = filteredSavings.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const totalSavings = savings.reduce((sum, s) => sum + s.total, 0);
  const avgSavings = savings.length > 0 ? totalSavings / savings.length : 0;

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === undefined || amount === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID");
  };

  const getExportFileSuffix = () => {
    const now = new Date();
    const pad = (num: number) => String(num).padStart(2, "0");
    return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  };

  const exportToExcel = async () => {
    if (filteredSavings.length === 0) return;

    setExportingType("excel");
    try {
      const XLSX = await import("xlsx");

      const summaryRows = [
        ["Ringkasan", "Nilai"],
        ["Total Data", filteredSavings.length],
        [
          "Total Simpanan",
          filteredSavings.reduce((sum, item) => sum + item.total, 0),
        ],
        [
          "Rata-rata Simpanan",
          filteredSavings.length > 0
            ? filteredSavings.reduce((sum, item) => sum + item.total, 0) /
              filteredSavings.length
            : 0,
        ],
        ["Waktu Export", new Date().toLocaleString("id-ID")],
      ];

      const dataRows = filteredSavings.map((item, index) => ({
        No: index + 1,
        Nama: item.userName,
        Email: item.email,
        Angkatan: item.angkatan,
        "Total Simpanan": item.total,
        "Terakhir Update": formatDate(item.updatedAt),
      }));

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
      const dataSheet = XLSX.utils.json_to_sheet(dataRows);

      summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
      dataSheet["!cols"] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 32 },
        { wch: 12 },
        { wch: 20 },
        { wch: 16 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan");
      XLSX.utils.book_append_sheet(workbook, dataSheet, "Daftar Simpanan");

      XLSX.writeFile(workbook, `keuangan-admin-${getExportFileSuffix()}.xlsx`);
    } catch (error) {
      console.error("Gagal export Excel:", error);
      window.alert("Gagal export Excel. Silakan coba lagi.");
    } finally {
      setExportingType(null);
    }
  };

  const exportToPdf = async () => {
    if (filteredSavings.length === 0) return;

    setExportingType("pdf");
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const autoTable = autoTableModule.default;
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });

      doc.setFontSize(16);
      doc.text("Laporan Keuangan Anggota", 40, 40);

      doc.setFontSize(10);
      doc.text(`Waktu export: ${new Date().toLocaleString("id-ID")}`, 40, 60);
      doc.text(`Total data: ${filteredSavings.length}`, 40, 75);

      autoTable(doc, {
        startY: 90,
        head: [
          [
            "No",
            "Nama",
            "Email",
            "Angkatan",
            "Total Simpanan",
            "Terakhir Update",
          ],
        ],
        body: filteredSavings.map((item, index) => [
          index + 1,
          item.userName,
          item.email,
          item.angkatan,
          formatCurrency(item.total),
          formatDate(item.updatedAt),
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 6,
        },
        headStyles: {
          fillColor: [60, 80, 224],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { halign: "center", cellWidth: 35 },
          4: { halign: "right", cellWidth: 120 },
        },
      });

      doc.save(`keuangan-admin-${getExportFileSuffix()}.pdf`);
    } catch (error) {
      console.error("Gagal export PDF:", error);
      window.alert("Gagal export PDF. Silakan coba lagi.");
    } finally {
      setExportingType(null);
    }
  };

  const stats = [
    {
      label: "Total Anggota",
      value: savings.length,
      icon: <Users className="h-5 w-5" />,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Total Simpanan",
      value: formatCurrency(totalSavings),
      icon: <Wallet className="h-5 w-5" />,
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Rata-rata Simpanan",
      value: formatCurrency(avgSavings),
      icon: <TrendingUp className="h-5 w-5" />,
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
      textColor: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark dark:text-white">
            Keuangan
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Kelola dan pantau simpanan anggota koperasi
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
          <span className="font-medium text-primary">Keuangan</span>
        </nav>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-stroke bg-white p-5 shadow-sm dark:border-strokedark dark:bg-boxdark"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className={`mt-2 text-2xl font-bold ${stat.textColor}`}>
                  {stat.value}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor} ${stat.textColor}`}
              >
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="rounded-xl border border-stroke bg-white shadow-sm dark:border-strokedark dark:bg-boxdark">
        {/* Search & Header */}
        <div className="border-b border-stroke p-6 dark:border-strokedark">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-dark dark:text-white">
              Daftar Simpanan Anggota
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari anggota..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="rounded-lg border border-stroke bg-white py-2 pl-10 pr-4 text-sm text-dark outline-none transition focus:border-primary dark:border-strokedark dark:bg-gray-800 dark:text-white dark:focus:border-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  disabled={
                    loading ||
                    filteredSavings.length === 0 ||
                    exportingType !== null
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-strokedark dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {exportingType === "excel" ? "Exporting..." : "Export Excel"}
                </button>
                <button
                  onClick={exportToPdf}
                  disabled={
                    loading ||
                    filteredSavings.length === 0 ||
                    exportingType !== null
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  {exportingType === "pdf" ? "Exporting..." : "Export PDF"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stroke dark:border-strokedark">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Anggota
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Angkatan
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Total Simpanan
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Terakhir Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-strokedark">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : paginatedSavings.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                  >
                    <Wallet className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="font-medium">Tidak ada data simpanan</p>
                    <p className="text-sm">Belum ada anggota dengan simpanan</p>
                  </td>
                </tr>
              ) : (
                paginatedSavings.map((saving) => (
                  <tr
                    key={saving.id}
                    className="transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {saving.userAvatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-dark dark:text-white">
                            {saving.userName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {saving.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {saving.angkatan}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(saving.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {saving.updatedAt
                          ? new Date(saving.updatedAt).toLocaleDateString(
                              "id-ID",
                            )
                          : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-stroke px-6 py-4 dark:border-strokedark">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Menampilkan {(page - 1) * itemsPerPage + 1}–
              {Math.min(page * itemsPerPage, filteredSavings.length)} dari{" "}
              {filteredSavings.length} data
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                if (p > totalPages) return null;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                      p === page
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
