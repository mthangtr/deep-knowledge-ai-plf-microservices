import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./use-auth";
import { supabase } from "@/lib/supabase";

interface Plan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  features: string[];
  is_active: boolean;
}

interface UseUserPlanState {
  currentPlan: Plan | null;
  allPlans: Plan[];
  loading: boolean;
  error: string | null;
}

interface CachedPlan {
  plan: Plan | null;
  timestamp: number;
  expiresAt: number;
}

// Cache key và thời gian cache (5 phút cho user plan, 30 phút cho all plans)
const PLAN_CACHE_KEY = "user_plan_cache";
const ALL_PLANS_CACHE_KEY = "all_plans_cache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ALL_PLANS_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for plans list

// Helper functions cho localStorage cache
const getPlanFromCache = (userId: string): Plan | null => {
  try {
    if (typeof window === "undefined") return null; // SSR safety

    const cached = localStorage.getItem(`${PLAN_CACHE_KEY}_${userId}`);
    if (!cached) return null;

    const parsedCache: CachedPlan = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now > parsedCache.expiresAt) {
      localStorage.removeItem(`${PLAN_CACHE_KEY}_${userId}`);
      return null;
    }

    return parsedCache.plan;
  } catch (error) {
    console.warn("Error reading plan from cache:", error);
    return null;
  }
};

const setPlanToCache = (userId: string, plan: Plan | null): void => {
  try {
    if (typeof window === "undefined") return; // SSR safety

    const now = Date.now();
    const cachedPlan: CachedPlan = {
      plan,
      timestamp: now,
      expiresAt: now + CACHE_DURATION,
    };
    localStorage.setItem(
      `${PLAN_CACHE_KEY}_${userId}`,
      JSON.stringify(cachedPlan)
    );
  } catch (error) {
    console.warn("Error saving plan to cache:", error);
  }
};

// Cache helpers cho all plans
const getAllPlansFromCache = (): Plan[] | null => {
  try {
    if (typeof window === "undefined") return null;

    const cached = localStorage.getItem(ALL_PLANS_CACHE_KEY);
    if (!cached) return null;

    const parsedCache = JSON.parse(cached);
    const now = Date.now();

    if (now > parsedCache.expiresAt) {
      localStorage.removeItem(ALL_PLANS_CACHE_KEY);
      return null;
    }

    return parsedCache.plans;
  } catch (error) {
    console.warn("Error reading all plans from cache:", error);
    return null;
  }
};

const setAllPlansToCache = (plans: Plan[]): void => {
  try {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const cachedPlans = {
      plans,
      timestamp: now,
      expiresAt: now + ALL_PLANS_CACHE_DURATION,
    };
    localStorage.setItem(ALL_PLANS_CACHE_KEY, JSON.stringify(cachedPlans));
  } catch (error) {
    console.warn("Error saving all plans to cache:", error);
  }
};

export function useUserPlan() {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<UseUserPlanState>({
    currentPlan: null,
    allPlans: [],
    loading: false,
    error: null,
  });

  // Lấy plan hiện tại của user từ user_profiles
  const fetchCurrentPlan = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setState((prev) => ({ ...prev, currentPlan: null, loading: false }));
      return;
    }

    // Check cache trước
    const cachedPlan = getPlanFromCache(user.id);
    if (cachedPlan !== null) {
      setState((prev) => ({
        ...prev,
        currentPlan: cachedPlan,
        loading: false,
        error: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Lấy user profile với plan info
      const { data: userProfile, error: userError } = await supabase
        .from("user_profiles")
        .select(
          `
          *,
          plan:plans(*)
        `
        )
        .eq("id", user.id)
        .maybeSingle();

      // Nếu user profile chưa tồn tại, trả về free plan
      if (userError && userError.code !== "PGRST116") {
        throw userError;
      }

      // Nếu không có profile hoặc plan, dùng free plan mặc định
      const currentPlan = userProfile?.plan || {
        id: "free",
        name: "free",
        price: 0,
        features: [
          "Basic AI model",
          "Up to 3 learning topics",
          "Standard support",
        ],
        is_active: true,
      };

      // Cache plan sau khi fetch thành công
      setPlanToCache(user.id, currentPlan);

      setState((prev) => ({
        ...prev,
        currentPlan,
        loading: false,
      }));
    } catch (error: any) {
      console.error("Error fetching current plan:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Không thể tải thông tin gói dịch vụ",
        loading: false,
      }));
    }
  }, [user, isAuthenticated]);

  // Lấy tất cả plans có sẵn
  const fetchAllPlans = useCallback(async () => {
    try {
      // Check cache trước
      const cachedPlans = getAllPlansFromCache();
      if (cachedPlans !== null) {
        setState((prev) => ({ ...prev, allPlans: cachedPlans }));
        return;
      }

      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .order("price", { ascending: true });

      if (error) throw error;

      const plans = data || [];

      // Cache plans sau khi fetch thành công
      setAllPlansToCache(plans);

      setState((prev) => ({ ...prev, allPlans: plans }));
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      setState((prev) => ({
        ...prev,
        error: error.message || "Không thể tải danh sách gói dịch vụ",
      }));
    }
  }, []);

  // Kiểm tra user có quyền truy cập tính năng không
  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!state.currentPlan) return false;
      return state.currentPlan.features.includes(feature);
    },
    [state.currentPlan]
  );

  // Kiểm tra user có plan premium không
  const isPremium = useCallback((): boolean => {
    return state.currentPlan?.name === "premium";
  }, [state.currentPlan]);

  // Kiểm tra user có plan free không
  const isFree = useCallback((): boolean => {
    return state.currentPlan?.name === "free" || !state.currentPlan; // Nếu không có plan nào thì coi như free
  }, [state.currentPlan]);

  // Lấy giá hiển thị của plan
  const formatPrice = useCallback(
    (price: number, currency: string = "USD"): string => {
      if (price === 0) return "Miễn phí";

      const formatter = new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 0,
      });

      return formatter.format(price / 100); // Convert cents to dollars
    },
    []
  );

  // Upgrade/downgrade plan - cập nhật plan_id trong user_profiles
  const changePlan = useCallback(
    async (planId: string): Promise<{ success: boolean; error?: string }> => {
      if (!user) {
        return {
          success: false,
          error: "Bạn cần đăng nhập để thay đổi gói dịch vụ",
        };
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Cập nhật plan_id trong user_profiles
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            plan_id: planId,
            plan_status: "active",
            plan_started_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) throw updateError;

        // Clear cache vì plan đã thay đổi
        if (typeof window !== "undefined") {
          localStorage.removeItem(`${PLAN_CACHE_KEY}_${user.id}`);
        }

        // Refresh current plan
        await fetchCurrentPlan();

        return { success: true };
      } catch (error: any) {
        console.error("Error changing plan:", error);
        setState((prev) => ({ ...prev, loading: false }));
        return {
          success: false,
          error: error.message || "Không thể thay đổi gói dịch vụ",
        };
      }
    },
    [user, fetchCurrentPlan]
  );

  // Load data khi component mount hoặc user thay đổi
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchCurrentPlan();
    }
    fetchAllPlans();
  }, [isAuthenticated, user, fetchCurrentPlan, fetchAllPlans]);

  // Clear error
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // Force refresh plan (bypass cache)
  const refreshPlan = useCallback(async () => {
    if (!user) return;

    // Clear cache trước
    if (typeof window !== "undefined") {
      localStorage.removeItem(`${PLAN_CACHE_KEY}_${user.id}`);
    }

    // Fetch fresh data
    await fetchCurrentPlan();
  }, [user, fetchCurrentPlan]);

  return {
    // State
    currentPlan: state.currentPlan,
    allPlans: state.allPlans,
    loading: state.loading,
    error: state.error,

    // Actions
    fetchCurrentPlan,
    fetchAllPlans,
    changePlan,
    clearError,
    refreshPlan,

    // Helpers
    hasFeature,
    isPremium,
    isFree,
    formatPrice,

    // Computed
    planName: state.currentPlan?.name || "free",
    planFeatures: state.currentPlan?.features || [],
    isActive: true, // Simplified since we're using direct plan_id reference
  };
}
