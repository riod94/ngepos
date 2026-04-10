import { createSignal, createResource } from "solid-js";
import { db, Staff } from "~/db/db";

const [currentUser, setCurrentUser] = createSignal<Staff | null>(null);
const [isAuthChecking, setIsAuthChecking] = createSignal(true);

export function useAuth() {
  // Check session storage on initial load
  const initAuth = async () => {
    try {
      const staffCount = await db.staff.count();
      if (staffCount === 0) {
        // Bypass login if no staff has ever been set up
        setCurrentUser({ id: 'admin', name: 'Admin', roleId: 'admin', pin: '0000', isActive: true, createdAt: Date.now() });
        setIsAuthChecking(false);
        return;
      }

      const activeId = sessionStorage.getItem("active_staff_id");
      if (activeId) {
        const staff = await db.staff.get(activeId);
        if (staff && staff.isActive) {
          setCurrentUser(staff);
        } else {
          sessionStorage.removeItem("active_staff_id");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuthChecking(false);
    }
  };

  const login = async (pin: string) => {
    const staffs = await db.staff.where("pin").equals(pin).toArray();
    const activeStaff = staffs.find(s => s.isActive);
    if (activeStaff) {
      sessionStorage.setItem("active_staff_id", activeStaff.id);
      setCurrentUser(activeStaff);
      return true;
    }
    return false;
  };

  const logout = () => {
    sessionStorage.removeItem("active_staff_id");
    setCurrentUser(null);
  };

  return { currentUser, isAuthChecking, initAuth, login, logout, setCurrentUser };
}
