import * as Icons from "../icons";

export const NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        roles: ["ADMIN", "ANGGOTA"],
        url: "/",
        items: [],
      },
    ],
  },
  {
    label: "TRANSAKSI ANGGOTA",
    items: [
      {
        title: "Pembayaran",
        icon: Icons.MoneySend,
        roles: ["ANGGOTA"],
        items: [
          {
            title: "Input Pembayaran",
            url: "/pembayaran",
          },
          {
            title: "Riwayat Pembayaran",
            url: "/pembayaran/riwayat",
          },
        ],
      },
      {
        title: "Penarikan",
        icon: Icons.MoneyReceive,
        roles: ["ANGGOTA"],
        items: [
          {
            title: "Request Penarikan",
            url: "/penarikan",
          },
          {
            title: "Riwayat Penarikan",
            url: "/penarikan/riwayat",
          },
        ],
      },
      {
        title: "Saldo Saya",
        url: "/saldo",
        icon: Icons.Wallet,
        roles: ["ANGGOTA"],
        items: [],
      },
    ],
  },
  {
    label: "ADMINISTRASI",
    items: [
      {
        title: "Kelola Anggota",
        icon: Icons.UsersGroup,
        roles: ["ADMIN"],
        items: [
          {
            title: "Daftar Anggota",
            url: "/admin/anggota",
          },
          {
            title: "Tunggakan",
            url: "/admin/anggota/tunggakan",
          },
        ],
      },
      {
        title: "Verifikasi",
        icon: Icons.CheckCircle,
        roles: ["ADMIN"],
        items: [
          {
            title: "Pembayaran",
            url: "/admin/verifikasi-pembayaran",
          },
          {
            title: "Penarikan",
            url: "/admin/verifikasi-penarikan",
          },
        ],
      },
      {
        title: "Keuangan",
        icon: Icons.Wallet,
        roles: ["ADMIN"],
        items: [
          {
            title: "Ringkasan Keuangan",
            url: "/admin/keuangan",
          },
          {
            title: "Transaksi Manual",
            url: "/admin/transaksi",
          },
          {
            title: "Riwayat Simpanan",
            url: "/admin/riwayat-simpanan",
          },
        ],
      },
      {
        title: "Laporan",
        icon: Icons.Report,
        roles: ["ADMIN"],
        url: "/admin/laporan",
        items: [],
      },
      {
        title: "Pengumuman",
        icon: Icons.BellIcon,
        roles: ["ADMIN"],
        url: "/admin/pengumuman",
        items: [],
      },
    ],
  },
  {
    label: "LAINNYA",
    items: [
      {
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
        roles: ["ADMIN", "ANGGOTA"],
        items: [],
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Icons.Settings,
        roles: ["ADMIN", "ANGGOTA"],
        items: [],
      },
    ],
  },
];