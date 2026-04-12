import { createSignal } from "solid-js";
import { db, Staff, Role } from "~/db/db";

interface AuthUser extends Staff {
	role?: Role;
}

const [currentUser, setCurrentUser] = createSignal<AuthUser | null>(null);
const [isAuthChecking, setIsAuthChecking] = createSignal(true);

export function useAuth() {
	// Check session on initial load
	const initAuth = async () => {
		try {
			setIsAuthChecking(true);
			const token = localStorage.getItem("auth_token");
			
			if (token) {
				const res = await fetch("/api/auth/me", {
					headers: { Authorization: `Bearer ${token}` }
				});
				
				if (res.ok) {
					const data = await res.json();
					setCurrentUser(data.user);
				} else {
					localStorage.removeItem("auth_token");
					setCurrentUser(null);
				}
			}
		} catch (e) {
			console.error("Auth Init Error:", e);
		} finally {
			setIsAuthChecking(false);
		}
	};

	const login = async (email: string, password: string) => {
		try {
			const res = await fetch("/api/auth/login", {
				method: "POST",
				body: JSON.stringify({ email, password }),
				headers: { "Content-Type": "application/json" }
			});

			if (!res.ok) {
				const data = await res.json();
				return { success: false, error: data.error, requireVerification: data.requireVerification };
			}

			const data = await res.json();
			localStorage.setItem("auth_token", data.token);
			setCurrentUser(data.user);
			return { success: true };
		} catch (e) {
			console.error("Login Error:", e);
			return { success: false, error: "Gagal terhubung ke server" };
		}
	};

	const register = async (name: string, email: string, password: string) => {
		try {
			const res = await fetch("/api/auth/register", {
				method: "POST",
				body: JSON.stringify({ name, email, password }),
				headers: { "Content-Type": "application/json" }
			});

			const data = await res.json();
			if (!res.ok) {
				return { success: false, error: data.error };
			}

			return { success: true, message: data.message, email: data.email };
		} catch (e) {
			console.error("Register Error:", e);
			return { success: false, error: "Gagal terhubung ke server" };
		}
	};

	const verify = async (email: string, otpCode: string) => {
		try {
			const res = await fetch("/api/auth/verify", {
				method: "POST",
				body: JSON.stringify({ email, otpCode }),
				headers: { "Content-Type": "application/json" }
			});

			const data = await res.json();
			if (!res.ok) {
				return { success: false, error: data.error };
			}

			return { success: true, message: data.message };
		} catch (e) {
			console.error("Verify Error:", e);
			return { success: false, error: "Gagal terhubung ke server" };
		}
	};

	const resendOtp = async (email: string) => {
		try {
			const res = await fetch("/api/auth/resend-otp", {
				method: "POST",
				body: JSON.stringify({ email }),
				headers: { "Content-Type": "application/json" }
			});

			const data = await res.json();
			if (!res.ok) {
				return { success: false, error: data.error };
			}

			return { success: true, message: data.message };
		} catch (e) {
			console.error("Resend OTP Error:", e);
			return { success: false, error: "Gagal terhubung ke server" };
		}
	};

	const updateProfile = async (name: string, email: string, phone: string) => {
		try {
			const token = localStorage.getItem("auth_token");
			const res = await fetch("/api/auth/update-profile", {
				method: "POST",
				body: JSON.stringify({ name, email, phone }),
				headers: { 
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}` 
				}
			});

			const data = await res.json();
			if (!res.ok) return { success: false, error: data.error };

			// Update local signal with fresh data
			const user = currentUser();
			if (user) {
				setCurrentUser({ ...user, name, email, phone });
			}

			return { success: true, message: data.message };
		} catch (e) {
			console.error("Update Profile Error:", e);
			return { success: false, error: "Gagal memproses pembaruan profil" };
		}
	};

	const changePassword = async (oldPassword: string, newPassword: string) => {
		try {
			const token = localStorage.getItem("auth_token");
			const res = await fetch("/api/auth/change-password", {
				method: "POST",
				body: JSON.stringify({ oldPassword, newPassword }),
				headers: { 
					"Content-Type": "application/json",
					"Authorization": `Bearer ${token}` 
				}
			});

			const data = await res.json();
			if (!res.ok) return { success: false, error: data.error };

			return { success: true, message: data.message };
		} catch (e) {
			console.error("Change Password Error:", e);
			return { success: false, error: "Gagal memproses perubahan password" };
		}
	};

	const logout = () => {
		localStorage.removeItem("auth_token");
		setCurrentUser(null);
	};

	const hasPermission = (permission: string) => {
		const user = currentUser();
		if (!user) return false;
		if (user.roleId === "admin") return true; // Super Admin bypass
		return user.role?.permissions.includes(permission) ?? false;
	};

	return { currentUser, isAuthChecking, initAuth, login, register, verify, resendOtp, updateProfile, changePassword, logout, hasPermission, setCurrentUser };
}
