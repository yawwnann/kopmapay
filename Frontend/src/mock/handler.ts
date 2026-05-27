/**
 * API Handler
 * Routes requests to either mock data or real API based on NEXT_PUBLIC_MOCK environment variable
 */

import { ENDPOINTS, API_BASE_URL, EndpointConfig } from "@/lib/apiConfig";
import * as mockData from "@/mock";
import { getProfileByUserId, updateProfile } from "@/mock/data/profile.mock";
import { ApiResponse, ApiError } from "@/types/api.types";

// Fakultas data from backend JSON
const FAKULTAS_DATA = {
  universitas: "Universitas Ahmad Dahlan",
  fakultas: [
    {
      nama: "Fakultas Agama Islam",
      jurusan: [
        "Ekonomi Syariah",
        "Hukum Keluarga Islam",
        "Pendidikan Agama Islam",
        "Perbankan Syariah",
      ],
    },
    {
      nama: "Fakultas Psikologi",
      jurusan: ["Psikologi"],
    },
    {
      nama: "Fakultas Ekonomi dan Bisnis",
      jurusan: ["Akuntansi", "Ekonomi Pembangunan", "Manajemen", "Perpajakan"],
    },
    {
      nama: "Fakultas Keguruan dan Ilmu Pendidikan",
      jurusan: [
        "Bimbingan dan Konseling",
        "Pendidikan Bahasa dan Sastra Indonesia",
        "Pendidikan Bahasa Inggris",
        "Pendidikan Guru PAUD",
        "Pendidikan Guru Sekolah Dasar",
        "Pendidikan Matematika",
        "Pendidikan Pancasila dan Kewarganegaraan",
        "Pendidikan Seni Drama Tari Musik",
        "Pendidikan Teknik Informatika dan Komputer",
        "Pendidikan Matematika",
      ],
    },
    {
      nama: "Fakultas Hukum",
      jurusan: ["Ilmu Hukum"],
    },
    {
      nama: "Fakultas Sastra, Budaya, dan Komunikasi",
      jurusan: ["Ilmu Komunikasi", "Sastra Inggris", "Seni Pertunjukan"],
    },
    {
      nama: "Fakultas Sains dan Teknologi Terapan",
      jurusan: [
        "Biologi Terapan",
        "Fisika Terapan",
        "Matematika Terapan",
        "Teknologi Informasi",
      ],
    },
    {
      nama: "Fakultas Farmasi",
      jurusan: ["Farmasi"],
    },
    {
      nama: "Fakultas Kesehatan Masyarakat",
      jurusan: ["Gizi", "Kesehatan Masyarakat"],
    },
    {
      nama: "Fakultas Teknologi Industri",
      jurusan: [
        "Teknik Industri",
        "Teknik Kimia",
        "Teknik Lingkungan",
        "Teknik Material",
        "Teknik Pertambangan",
      ],
    },
    {
      nama: "Fakultas Kedokteran",
      jurusan: ["Pendidikan Dokter"],
    },
  ],
};

// Check if mock mode is enabled (accept several truthy string formats)
const MOCK_FLAG = (process.env.NEXT_PUBLIC_MOCK ?? "").trim().toLowerCase();
const USE_MOCK = ["true", "1", "yes", "on"].includes(MOCK_FLAG);

console.log(
  `[API Handler] NEXT_PUBLIC_MOCK=${JSON.stringify(process.env.NEXT_PUBLIC_MOCK)} | Mode: ${USE_MOCK ? "MOCK" : "REAL API"}`,
);

/**
 * Simulates network delay
 * @param ms Delay in milliseconds (default: 500ms)
 */
const delay = (ms: number = 500) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Creates mock error response
 */
const createMockError = (statusCode: number, message: string): ApiError => ({
  success: false,
  error: {
    message,
    statusCode,
  },
});

/**
 * Creates mock success response
 */
const createMockResponse = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  data,
  message,
});

/**
 * Creates mock error response as ApiResponse
 */
const createMockErrorResponse = (
  statusCode: number,
  message: string,
): ApiResponse => ({
  success: false,
  data: { message, statusCode } as any,
});

/**
 * Helper to wrap backend responses in ApiResponse format
 * Automatically unwraps if backend already wrapped the response
 */
const wrapBackendResponse = (data: any, message?: string): ApiResponse => {
  // If backend already wrapped response, unwrap it
  if (data && data.success && data.data !== undefined) {
    return {
      success: true,
      data: data.data,
      message: data.message || message,
    };
  }

  return {
    success: true,
    data,
    message,
  };
};

/**
 * Gets auth token from headers or storage
 */
const getAuthToken = (): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }
  return null;
};

/**
 * Creates headers for real API requests
 */
const createHeaders = (
  token?: string | null,
  isFormData?: boolean,
): HeadersInit => {
  const headers: HeadersInit = {};

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Handles authentication requests
 */
async function handleAuthLogin(credentials: {
  email: string;
  password: string;
}): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.handleLogin(credentials);
    return response.success
      ? createMockResponse(response.data, "Login successful")
      : createMockErrorResponse(401, response.error || "Invalid credentials");
  }

  // Real API call
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: createHeaders(),
    credentials: "include", // Include cookies
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Login failed");
  }

  const data = await response.json();

  // Wrap backend response in ApiResponse format
  return {
    success: true,
    data: data,
    message: "Login successful",
  };
}

/**
 * Handles get current user
 */
async function handleAuthMe(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const token = getAuthToken();
    const response = mockData.handleAuthMe(token);
    return response.success
      ? createMockResponse(response.data)
      : createMockErrorResponse(401, response.error || "Not authenticated");
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: createHeaders(token),
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to get user data");
    }

    const data = await response.json();

    // Wrap backend response in ApiResponse format
    return {
      success: true,
      data,
    };
  } catch {
    const token = getAuthToken();
    const fallback = mockData.handleAuthMe(token);
    return fallback.success
      ? createMockResponse(fallback.data)
      : createMockErrorResponse(401, fallback.error || "Not authenticated");
  }
}

/**
 * Handles refresh token
 */
async function handleAuthRefresh(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    // Mock: generate new token and return it
    const newToken = `mock_refresh_token_${Date.now()}`;
    const newAccessToken = `mock_access_token_${Date.now()}`;

    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", newAccessToken);
    }

    return createMockResponse(
      { access_token: newAccessToken },
      "Token refreshed successfully",
    );
  }

  // Real API call - backend will handle cookie setting
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      ...createHeaders(),
      "Content-Type": "application/json",
    },
    credentials: "include", // Include cookies
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Token refresh failed");
  }

  const data = await response.json();
  return wrapBackendResponse(data, "Token refreshed successfully");
}

/**
 * Handles logout
 */
async function handleAuthLogout(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
    }
    return createMockResponse(null, "Logged out successfully");
  }

  // Real API call - backend will clear cookie
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    headers: createHeaders(),
    credentials: "include",
    body: JSON.stringify({ refresh_token: "" }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Logout failed");
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_user");
  }

  const data = await response.json();
  return wrapBackendResponse(data, "Logged out successfully");
}

/**
 * Handles logout all devices
 */
async function handleAuthLogoutAll(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("current_user");
    }
    return createMockResponse(null, "Logged out from all devices successfully");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/auth/logout-all`, {
    method: "POST",
    headers: createHeaders(token),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Logout all failed");
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("current_user");
  }

  const data = await response.json();
  return wrapBackendResponse(data, "Logged out from all devices successfully");
}

/**
 * Handles update current user profile
 */
async function handleUpdateMe(data: any): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    // Mock: update local storage user data
    if (typeof window !== "undefined") {
      const currentUser = JSON.parse(
        localStorage.getItem("current_user") || "{}",
      );
      const updatedUser = { ...currentUser, ...data };
      localStorage.setItem("current_user", JSON.stringify(updatedUser));
    }
    return createMockResponse(data, "Profile updated successfully");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    method: "PATCH",
    headers: createHeaders(token),
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update profile");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData, "Profile updated successfully");
}

/**
 * Handles users list
 */
async function handleUsersList(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const users = mockData.getUsersList();
    return createMockResponse(users);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "GET",
    headers: createHeaders(token),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch users");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles delinquent users (users without mandatory payment for 5+ months)
 */
async function handleDelinquentUsers(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    // Mock data: filter users who haven't paid mandatory savings
    const users = mockData.getUsersList();
    const delinquentUsers = users
      .filter((user: any) => user.role === "ANGGOTA")
      .map((user: any) => ({
        ...user,
        lastPaymentDate: null,
        monthsWithoutPayment: Math.floor(Math.random() * 12) + 5, // Random 5-16 months
      }))
      .slice(0, 3); // Return only 3 for demo
    return createMockResponse(delinquentUsers);
  }

  const token = getAuthToken();
  const response = await fetch(
    `${API_BASE_URL}/users/delinquent/mandatory-payment`,
    {
      method: "GET",
      headers: createHeaders(token),
      credentials: "include",
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch delinquent users");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles get single user
 */
async function handleGetUser(id: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const user = mockData.getUserById(id);
    if (!user) {
      return createMockErrorResponse(404, "User not found");
    }
    return createMockResponse(user);
  }

  const token = getAuthToken();
  const url = API_BASE_URL + "/users/" + id;
  const response = await fetch(url, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch user");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles create user
 */
async function handleCreateUser(userData: any): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();

    const response = mockData.createUser(userData);
    return response.success
      ? createMockResponse(response.data, "User created successfully")
      : createMockErrorResponse(400, response.error || "Failed to create user");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create user");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles update user
 */
async function handleUpdateUser(
  id: string,
  userData: any,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.updateUser(id, userData);
    return response.success
      ? createMockResponse(response.data, "User updated successfully")
      : createMockErrorResponse(400, response.error || "Failed to update user");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: "PATCH",
    headers: createHeaders(token),
    body: JSON.stringify(userData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update user");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles delete user
 */
async function handleDeleteUser(id: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.deleteUser(id);
    return response.success
      ? createMockResponse(null, "User deleted successfully")
      : createMockErrorResponse(400, response.error || "Failed to delete user");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/${id}`, {
    method: "DELETE",
    headers: createHeaders(token),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete user");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles update user photo
 */
async function handleUpdateUserPhoto(
  id: string,
  formData: any,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    return createMockResponse(
      { photo: "https://res.cloudinary.com/mock/photo.jpg" },
      "User photo updated successfully",
    );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/${id}/photo`, {
    method: "PATCH",
    headers: createHeaders(token, true), // isFormData = true
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update user photo");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles delete user photo
 */
async function handleDeleteUserPhoto(id: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    return createMockResponse(null, "User photo deleted successfully");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/${id}/photo`, {
    method: "DELETE",
    headers: createHeaders(token),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete user photo");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles payments list
 */
async function handlePaymentsList(
  queryParams?: Record<string, string>,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const payments = mockData.getPaymentsList(queryParams);
    return createMockResponse(payments);
  }

  const token = getAuthToken();
  const queryString = queryParams
    ? `?${new URLSearchParams(queryParams).toString()}`
    : "";
  const response = await fetch(`${API_BASE_URL}/payments${queryString}`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch payments");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles get single payment
 */
async function handleGetPayment(id: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const payment = mockData.getPaymentById(id);
    if (!payment) {
      return createMockErrorResponse(404, "Payment not found");
    }
    return createMockResponse(payment);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/payments/${id}`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch payment");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles create payment
 */
async function handleCreatePayment(
  paymentData: any,
  isFormData?: boolean,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.createPayment(paymentData);
    return response.success
      ? createMockResponse(response.data, "Payment created successfully")
      : createMockErrorResponse(
          400,
          response.error || "Failed to create payment",
        );
  }

  const token = getAuthToken();
  const headers = createHeaders(token, isFormData);

  const response = await fetch(`${API_BASE_URL}/payments`, {
    method: "POST",
    headers,
    credentials: "include",
    body: isFormData ? paymentData : JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create payment");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles approve/reject payment
 */
async function handleApprovePayment(
  id: string,
  approvalData: any,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.approvePayment(id, approvalData);
    return response.success
      ? createMockResponse(response.data, "Payment approved successfully")
      : createMockErrorResponse(
          400,
          response.error || "Failed to approve payment",
        );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/payments/${id}/approve`, {
    method: "PATCH",
    headers: createHeaders(token),
    body: JSON.stringify(approvalData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve payment");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles withdrawals list
 */
async function handleWithdrawalsList(
  queryParams?: Record<string, string>,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const withdrawals = mockData.getWithdrawalsList(queryParams);
    return createMockResponse(withdrawals);
  }

  const token = getAuthToken();
  const queryString = queryParams
    ? `?${new URLSearchParams(queryParams).toString()}`
    : "";
  const response = await fetch(`${API_BASE_URL}/withdrawals${queryString}`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch withdrawals");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles get single withdrawal
 */
async function handleGetWithdrawal(id: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const withdrawal = mockData.getWithdrawalById(id);
    if (!withdrawal) {
      return createMockErrorResponse(404, "Withdrawal not found");
    }
    return createMockResponse(withdrawal);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/withdrawals/${id}`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch withdrawal");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles create withdrawal
 */
async function handleCreateWithdrawal(
  withdrawalData: any,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.createWithdrawal(withdrawalData);
    return response.success
      ? createMockResponse(response.data, "Withdrawal created successfully")
      : createMockErrorResponse(
          400,
          response.error || "Failed to create withdrawal",
        );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/withdrawals`, {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify(withdrawalData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create withdrawal");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles withdraw all
 */
async function handleWithdrawAll(data: any): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    return createMockErrorResponse(
      501,
      "Mock for withdraw all is not yet implemented",
    );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/withdrawals/withdraw-all`, {
    method: "POST",
    headers: createHeaders(token),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to withdraw all");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles approve/reject withdrawal
 */
async function handleApproveWithdrawal(
  id: string,
  approvalData: any,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const response = mockData.approveWithdrawal(id, approvalData);
    return response.success
      ? createMockResponse(response.data, "Withdrawal approved successfully")
      : createMockErrorResponse(
          400,
          response.error || "Failed to approve withdrawal",
        );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/withdrawals/${id}/approve`, {
    method: "PATCH",
    headers: createHeaders(token),
    body: JSON.stringify(approvalData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to approve withdrawal");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles get current user savings
 */
async function handleMySavings(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const token = getAuthToken();
    const savings = mockData.getMySavings(token);
    if (!savings) {
      return createMockErrorResponse(404, "Savings not found");
    }
    return createMockResponse(savings);
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/savings/me`, {
      method: "GET",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch savings");
    }

    const responseData = await response.json();
    return wrapBackendResponse(responseData);
  } catch {
    const token = getAuthToken();
    const savings = mockData.getMySavings(token);
    if (!savings) {
      return createMockErrorResponse(404, "Savings not found");
    }
    return createMockResponse(savings);
  }
}

/**
 * Handles all users savings
 */
async function handleAllSavings(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const savings = mockData.getAllSavings();
    return createMockResponse(savings);
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/savings`, {
      method: "GET",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch all savings");
    }

    const responseData = await response.json();
    return wrapBackendResponse(responseData);
  } catch {
    const savings = mockData.getAllSavings();
    return createMockResponse(savings);
  }
}

/**
 * Handles savings breakdown
 */
async function handleSavingsBreakdown(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const mySavings = mockData.getMySavings(getAuthToken());
    const balance = mySavings?.balance || 0;
    const breakdown = {
      pokok: Math.round(balance * 0.2),
      wajib: Math.round(balance * 0.5),
      sukarela: Math.round(balance * 0.3),
    };
    return createMockResponse({
      total: balance,
      breakdown,
      details: [
        { type: "Simpanan Pokok", amount: breakdown.pokok },
        { type: "Simpanan Wajib", amount: breakdown.wajib },
        { type: "Simpanan Sukarela", amount: breakdown.sukarela },
      ],
    });
  }

  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/savings/me/breakdown`, {
      method: "GET",
      headers: createHeaders(token),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch savings breakdown");
    }

    const responseData = await response.json();
    return wrapBackendResponse(responseData);
  } catch {
    const mySavings = mockData.getMySavings(getAuthToken());
    const balance = mySavings?.balance || 0;
    const breakdown = {
      pokok: Math.round(balance * 0.2),
      wajib: Math.round(balance * 0.5),
      sukarela: Math.round(balance * 0.3),
    };

    return createMockResponse({
      total: balance,
      breakdown,
      details: [
        { type: "Simpanan Pokok", amount: breakdown.pokok },
        { type: "Simpanan Wajib", amount: breakdown.wajib },
        { type: "Simpanan Sukarela", amount: breakdown.sukarela },
      ],
    });
  }
}

/**
 * Handles savings breakdown for specific user
 */
async function handleSavingsBreakdownByUserId(
  userId: string,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const balance = 150000;
    const breakdown = {
      pokok: 50000,
      wajib: 50000,
      sukarela: 50000,
    };
    return createMockResponse({
      total: balance,
      breakdown,
      details: [
        { type: "Simpanan Pokok", amount: breakdown.pokok },
        { type: "Simpanan Wajib", amount: breakdown.wajib },
        { type: "Simpanan Sukarela", amount: breakdown.sukarela },
      ],
    });
  }

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/savings/${userId}/breakdown`,
      {
        method: "GET",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to fetch user savings breakdown",
      );
    }

    const responseData = await response.json();
    return wrapBackendResponse(responseData);
  } catch (err: any) {
    console.error("[Fallback to mock]", err);
    const balance = 150000;
    const breakdown = {
      pokok: 50000,
      wajib: 50000,
      sukarela: 50000,
    };

    return createMockResponse({
      total: balance,
      breakdown,
      details: [
        { type: "Simpanan Pokok", amount: breakdown.pokok },
        { type: "Simpanan Wajib", amount: breakdown.wajib },
        { type: "Simpanan Sukarela", amount: breakdown.sukarela },
      ],
    });
  }
}

async function handleSavingsHistory(
  userId: string,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    return createMockResponse({
      userId,
      mandatorySavings: [
        {
          id: "mock-ms-1",
          month: 1,
          year: 2026,
          nominal: 50000,
          status: "PAID",
          paidAt: "2026-01-15T00:00:00.000Z",
          payment: {
            id: "mock-pay-1",
            createdAt: "2026-01-15T00:00:00.000Z",
            status: "APPROVED",
            paymentMethod: "Cash",
          },
        },
        {
          id: "mock-ms-2",
          month: 2,
          year: 2026,
          nominal: 50000,
          status: "PAID",
          paidAt: "2026-02-10T00:00:00.000Z",
          payment: {
            id: "mock-pay-2",
            createdAt: "2026-02-10T00:00:00.000Z",
            status: "APPROVED",
            paymentMethod: "QRIS",
          },
        },
        {
          id: "mock-ms-3",
          month: 3,
          year: 2026,
          nominal: 50000,
          status: "UNPAID",
          paidAt: null,
          payment: null,
        },
        {
          id: "mock-ms-4",
          month: 4,
          year: 2026,
          nominal: 50000,
          status: "UNPAID",
          paidAt: null,
          payment: null,
        },
      ],
      voluntarySavings: [
        {
          id: "mock-vs-1",
          nominal: 100000,
          createdAt: "2026-01-20T00:00:00.000Z",
          payment: {
            id: "mock-pay-3",
            createdAt: "2026-01-20T00:00:00.000Z",
            status: "APPROVED",
            paymentMethod: "BankTransfer",
          },
        },
        {
          id: "mock-vs-2",
          nominal: 75000,
          createdAt: "2026-03-05T00:00:00.000Z",
          payment: {
            id: "mock-pay-4",
            createdAt: "2026-03-05T00:00:00.000Z",
            status: "APPROVED",
            paymentMethod: "Cash",
          },
        },
      ],
    });
  }

  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/savings/history/${userId}`,
      {
        method: "GET",
        headers: createHeaders(token),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to fetch savings history",
      );
    }

    const responseData = await response.json();
    return wrapBackendResponse(responseData);
  } catch (err: any) {
    console.error("[Fallback to mock]", err);
    return createMockResponse({
      userId,
      mandatorySavings: [],
      voluntarySavings: [],
    });
  }
}

/**
 * Handles savings chart data
 */
async function handleSavingsChart(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const mySavings = mockData.getMySavings(getAuthToken());
    const balance = mySavings?.balance || 7594176;

    // Generate last 6 months labels
    const months: string[] = [];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${monthNames[d.getMonth()]} ${d.getFullYear()}`);
    }

    // Generate chart data with varying values (gradual increase with realistic progression)
    const baseValues = [
      Math.round(balance * 0.25 + Math.random() * 100000), // 6 months ago: ~25%
      Math.round(balance * 0.35 + Math.random() * 100000), // 5 months ago: ~35%
      Math.round(balance * 0.5 + Math.random() * 100000), // 4 months ago: ~50%
      Math.round(balance * 0.65 + Math.random() * 100000), // 3 months ago: ~65%
      Math.round(balance * 0.8 + Math.random() * 100000), // 2 months ago: ~80%
      Math.round(balance * 0.95 + Math.random() * 100000), // current: ~95-100%
    ];

    const chartData = months.map((label, index) => ({
      label,
      balance: baseValues[index],
    }));

    return createMockResponse({
      labels: months,
      data: chartData,
    });
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/savings/me/chart`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch savings chart");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles profile - get current user's profile
 */
async function handleMyProfile(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();

    // Get current user from auth mock
    const authResponse = mockData.handleAuthMe("");
    if (!authResponse || !("data" in authResponse) || !authResponse.data) {
      return createMockErrorResponse(401, "Unauthorized");
    }

    const userId = authResponse.data.id;
    const profile = getProfileByUserId(userId);

    if (!profile) {
      return createMockErrorResponse(404, "Profile not found");
    }

    return createMockResponse(profile, "Profile retrieved successfully");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch profile");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles profile update
 */
async function handleUpdateMyProfile(data: any): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();

    // Get current user from auth mock
    const authResponse = mockData.handleAuthMe("");
    if (!authResponse || !("data" in authResponse) || !authResponse.data) {
      return createMockErrorResponse(401, "Unauthorized");
    }

    const userId = authResponse.data.id;
    const profile = updateProfile(userId, data);

    if (!profile) {
      return createMockErrorResponse(404, "Profile not found");
    }

    return createMockResponse(profile, "Profile updated successfully");
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/profile/me`, {
    method: "PATCH",
    headers: {
      ...createHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update profile");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles daily report
 */
async function handleDailyReport(date?: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const report = mockData.getDailyReport(date);
    return createMockResponse(report);
  }

  const token = getAuthToken();
  const queryString = date ? `?date=${date}` : "";
  const response = await fetch(`${API_BASE_URL}/reports/daily${queryString}`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch daily report");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles angkatan (cohort) report
 */
async function handleAngkatanReport(angkatan?: string): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const report = mockData.getAngkatanReport(angkatan);
    return createMockResponse(report);
  }

  const token = getAuthToken();
  const queryString = angkatan ? `?angkatan=${angkatan}` : "";
  const response = await fetch(
    `${API_BASE_URL}/reports/angkatan${queryString}`,
    {
      method: "GET",
      headers: createHeaders(token),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch angkatan report");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles system summary report
 */
async function handleSummaryReport(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const summary = mockData.getSystemSummary();
    return createMockResponse(summary);
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/reports/summary`, {
    method: "GET",
    headers: createHeaders(token),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch summary report");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles dashboard data
 */
async function handleDashboard(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    // Return mock dashboard data
    return createMockResponse(
      {
        totalMembers: 50,
        totalSavings: 125000000,
        pendingPayments: 15,
        pendingWithdrawals: 8,
        recentActivities: [],
        recentApprovals: [],
        recentAlerts: [],
        paymentTrend: [],
        paymentStatus: {},
        savingsBreakdown: {},
        memberActivity: {},
      },
      "Dashboard data retrieved successfully",
    );
  }

  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/dashboard`, {
    method: "GET",
    headers: createHeaders(token),
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch dashboard");
  }

  const responseData = await response.json();
  return wrapBackendResponse(
    responseData,
    "Dashboard data retrieved successfully",
  );
}

/**
 * Handles fakultas list
 */
async function handleFakultasList(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    const fakultasNames = FAKULTAS_DATA.fakultas.map((f) => f.nama);
    return createMockResponse(fakultasNames);
  }

  const response = await fetch(`${API_BASE_URL}/fakultas/list`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch fakultas list");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles fakultas jurusan
 */
async function handleFakultasJurusan(
  fakultasName?: string,
): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    if (!fakultasName) {
      return createMockErrorResponse(400, "Fakultas parameter is required");
    }

    const fakultas = FAKULTAS_DATA.fakultas.find(
      (f) => f.nama === fakultasName,
    );
    if (!fakultas) {
      return createMockErrorResponse(404, "Fakultas not found");
    }

    return createMockResponse(fakultas.jurusan);
  }

  const response = await fetch(
    `${API_BASE_URL}/fakultas/jurusan?fakultas=${encodeURIComponent(fakultasName || "")}`,
    { method: "GET" },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch jurusan");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Handles all fakultas data
 */
async function handleFakultasAll(): Promise<ApiResponse> {
  if (USE_MOCK) {
    await delay();
    return createMockResponse(FAKULTAS_DATA);
  }

  const response = await fetch(`${API_BASE_URL}/fakultas`, {
    method: "GET",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch fakultas");
  }

  const responseData = await response.json();
  return wrapBackendResponse(responseData);
}

/**
 * Main API handler function
 * Routes requests to appropriate handler based on endpoint
 */
export async function apiHandler(
  endpoint: string,
  method: string = "GET",
  data?: any,
  params?: Record<string, any>,
  isFormData?: boolean,
): Promise<ApiResponse> {
  try {
    // Auth endpoints
    if (endpoint === "/auth/login") {
      return handleAuthLogin(data);
    }
    if (endpoint === "/auth/me") {
      return handleAuthMe();
    }
    if (endpoint === "/auth/refresh") {
      return handleAuthRefresh();
    }
    if (endpoint === "/auth/logout") {
      return handleAuthLogout();
    }
    if (endpoint === "/auth/logout-all") {
      return handleAuthLogoutAll();
    }

    // Users endpoints
    if (endpoint === "/users/me" && method === "GET") {
      return handleAuthMe(); // Same as /auth/me
    }
    if (endpoint === "/users/me" && method === "PATCH") {
      return handleUpdateMe(data);
    }
    if (endpoint === "/users" && method === "GET") {
      return handleUsersList();
    }
    if (
      endpoint === "/users/delinquent/mandatory-payment" &&
      method === "GET"
    ) {
      return handleDelinquentUsers();
    }
    if (endpoint.startsWith("/users/") && method === "GET") {
      const id = endpoint.split("/")[2];
      return handleGetUser(id);
    }
    if (endpoint === "/users" && method === "POST") {
      return handleCreateUser(data);
    }
    if (endpoint.startsWith("/users/") && method === "PATCH") {
      const id = endpoint.split("/")[2];
      // Check if it's a photo update
      if (endpoint.includes("/photo")) {
        return handleUpdateUserPhoto(id, data);
      }
      return handleUpdateUser(id, data);
    }
    if (endpoint.startsWith("/users/") && method === "DELETE") {
      const id = endpoint.split("/")[2];
      // Check if it's a photo deletion
      if (endpoint.includes("/photo")) {
        return handleDeleteUserPhoto(id);
      }
      return handleDeleteUser(id);
    }

    // Payments endpoints
    if (endpoint === "/payments" && method === "GET") {
      return handlePaymentsList(params);
    }
    if (
      endpoint.startsWith("/payments/") &&
      !endpoint.includes("/approve") &&
      method === "GET"
    ) {
      const id = endpoint.split("/")[2];
      return handleGetPayment(id);
    }
    if (endpoint === "/payments" && method === "POST") {
      return handleCreatePayment(data, isFormData);
    }
    if (
      endpoint.startsWith("/payments/") &&
      endpoint.includes("/approve") &&
      method === "PATCH"
    ) {
      const id = endpoint.split("/")[2];
      return handleApprovePayment(id, data);
    }

    // Withdrawals endpoints
    if (endpoint === "/withdrawals" && method === "GET") {
      return handleWithdrawalsList(params);
    }
    if (
      endpoint.startsWith("/withdrawals/") &&
      !endpoint.includes("/approve") &&
      method === "GET"
    ) {
      const id = endpoint.split("/")[2];
      return handleGetWithdrawal(id);
    }
    if (endpoint === "/withdrawals/withdraw-all" && method === "POST") {
      return handleWithdrawAll(data);
    }
    if (endpoint === "/withdrawals" && method === "POST") {
      return handleCreateWithdrawal(data);
    }
    if (
      endpoint.startsWith("/withdrawals/") &&
      endpoint.includes("/approve") &&
      method === "PATCH"
    ) {
      const id = endpoint.split("/")[2];
      return handleApproveWithdrawal(id, data);
    }

    // Savings endpoints
    if (endpoint === "/savings/me") {
      return handleMySavings();
    }
    if (endpoint === "/savings/me/breakdown") {
      return handleSavingsBreakdown();
    }
    if (endpoint === "/savings/me/chart") {
      return handleSavingsChart();
    }
    if (endpoint === "/savings") {
      return handleAllSavings();
    }
    if (
      endpoint.startsWith("/savings/") &&
      endpoint.endsWith("/breakdown") &&
      endpoint !== "/savings/me/breakdown"
    ) {
      const userId = endpoint.split("/")[2];
      return handleSavingsBreakdownByUserId(userId);
    }
    if (endpoint.match(/^\/savings\/history\/[^\/]+$/)) {
      const userId = endpoint.split("/")[3];
      return handleSavingsHistory(userId);
    }

    // Profile endpoints
    if (endpoint === "/profile/me" && method === "GET") {
      return handleMyProfile();
    }
    if (endpoint === "/profile/me" && method === "PATCH") {
      return handleUpdateMyProfile(data);
    }

    // Reports endpoints
    if (endpoint.startsWith("/reports/daily")) {
      const date = params?.date;
      return handleDailyReport(date);
    }
    if (endpoint.startsWith("/reports/angkatan")) {
      const angkatan = params?.angkatan;
      return handleAngkatanReport(angkatan);
    }
    if (endpoint === "/reports/summary") {
      return handleSummaryReport();
    }

    // Dashboard endpoint
    if (endpoint === "/dashboard") {
      return handleDashboard();
    }

    // Fakultas endpoints
    if (endpoint === "/fakultas") {
      return handleFakultasAll();
    }
    if (endpoint === "/fakultas/list") {
      return handleFakultasList();
    }
    if (endpoint === "/fakultas/jurusan") {
      return handleFakultasJurusan(params?.fakultas);
    }

    // Announcements endpoints — proxy to real backend (no mock data)
    if (endpoint === "/announcements/active" && method === "GET") {
      if (USE_MOCK)
        return createMockResponse([], "No active announcements (mock)");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/announcements/active`, {
        method: "GET",
        headers: createHeaders(token),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }
    if (endpoint === "/announcements" && method === "GET") {
      if (USE_MOCK) return createMockResponse([], "No announcements (mock)");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: "GET",
        headers: createHeaders(token),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }
    if (endpoint === "/announcements" && method === "POST") {
      if (USE_MOCK) return createMockResponse({}, "Mock create not supported");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/announcements`, {
        method: "POST",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }
    if (endpoint.startsWith("/announcements/") && method === "PATCH") {
      if (USE_MOCK) return createMockResponse({}, "Mock update not supported");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "PATCH",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }
    if (endpoint.startsWith("/announcements/") && method === "DELETE") {
      if (USE_MOCK) return createMockResponse({}, "Mock delete not supported");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "DELETE",
        headers: createHeaders(token),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }

    // Admin transactions endpoints — proxy to real backend
    if (endpoint === "/admin/transactions/income" && method === "POST") {
      if (USE_MOCK) return createMockResponse({}, "Mock admin income not supported");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/transactions/income`, {
        method: "POST",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }
    if (endpoint === "/admin/transactions/withdrawal" && method === "POST") {
      if (USE_MOCK) return createMockResponse({}, "Mock admin withdrawal not supported");
      const token = getAuthToken();
      const response = await fetch(`${API_BASE_URL}/admin/transactions/withdrawal`, {
        method: "POST",
        headers: createHeaders(token),
        body: JSON.stringify(data),
      });
      const d = await response.json();
      return wrapBackendResponse(d);
    }

    throw new Error(`Unknown endpoint: ${endpoint}`);
  } catch (error: any) {
    console.error("[API Handler Error]:", error);
    return createMockErrorResponse(
      error.statusCode || 500,
      error.message || "Internal server error",
    );
  }
}
