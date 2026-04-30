"use client";

import { useEffect, useState, useCallback } from "react";
import { getUser, gqlRequest } from "@/lib/nhost";

interface DataChange {
  type: "transaction" | "budget" | "goal" | "debt";
  action: "insert" | "update" | "delete";
  data: any;
  timestamp: number;
}

export function useRealtimeData() {
  const [changes, setChanges] = useState<DataChange[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSync, setLastSync] = useState<number>(Date.now());

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Poll for changes every 5 seconds when online
  useEffect(() => {
    if (!isOnline) return;
    
    const interval = setInterval(async () => {
      await checkForChanges();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isOnline, lastSync]);

  const checkForChanges = async () => {
    const user = await getUser();
    if (!user) return;

    const since = new Date(lastSync).toISOString();
    
    // Check for recent changes across all tables
    const [transChanges, budgetChanges, goalChanges, debtChanges] = await Promise.all([
      gqlRequest(`
        query {
          transactions(
            where: {
              user_id: {_eq: "${user.id}"},
              _or: [
                {created_at: {_gte: "${since}"}},
                {updated_at: {_gte: "${since}"}}
              ]
            },
            order_by: {created_at: desc},
            limit: 10
          ) {
            id type amount category date note created_at updated_at
          }
        }
      `),
      gqlRequest(`
        query {
          budgets(
            where: {
              user_id: {_eq: "${user.id}"},
              _or: [
                {created_at: {_gte: "${since}"}},
                {updated_at: {_gte: "${since}"}}
              ]
            },
            order_by: {created_at: desc},
            limit: 10
          ) {
            id category monthly_limit month created_at updated_at
          }
        }
      `),
      gqlRequest(`
        query {
          goals(
            where: {
              user_id: {_eq: "${user.id}"},
              _or: [
                {created_at: {_gte: "${since}"}},
                {updated_at: {_gte: "${since}"}}
              ]
            },
            order_by: {created_at: desc},
            limit: 10
          ) {
            id name target_amount saved_amount deadline created_at updated_at
          }
        }
      `),
      gqlRequest(`
        query {
          debts(
            where: {
              user_id: {_eq: "${user.id}"},
              _or: [
                {created_at: {_gte: "${since}"}},
                {updated_at: {_gte: "${since}"}}
              ]
            },
            order_by: {created_at: desc},
            limit: 10
          ) {
            id name amount direction is_paid due_date created_at updated_at
          }
        }
      `),
    ]);

    const newChanges: DataChange[] = [];
    
    if (transChanges.data?.transactions?.length > 0) {
      transChanges.data.transactions.forEach((t: any) => {
        newChanges.push({
          type: "transaction",
          action: t.updated_at > t.created_at ? "update" : "insert",
          data: t,
          timestamp: Date.parse(t.updated_at || t.created_at),
        });
      });
    }
    
    if (budgetChanges.data?.budgets?.length > 0) {
      budgetChanges.data.budgets.forEach((b: any) => {
        newChanges.push({
          type: "budget",
          action: b.updated_at > b.created_at ? "update" : "insert",
          data: b,
          timestamp: Date.parse(b.updated_at || b.created_at),
        });
      });
    }
    
    if (goalChanges.data?.goals?.length > 0) {
      goalChanges.data.goals.forEach((g: any) => {
        newChanges.push({
          type: "goal",
          action: g.updated_at > g.created_at ? "update" : "insert",
          data: g,
          timestamp: Date.parse(g.updated_at || g.created_at),
        });
      });
    }
    
    if (debtChanges.data?.debts?.length > 0) {
      debtChanges.data.debts.forEach((d: any) => {
        newChanges.push({
          type: "debt",
          action: d.updated_at > d.created_at ? "update" : "insert",
          data: d,
          timestamp: Date.parse(d.updated_at || d.created_at),
        });
      });
    }

    if (newChanges.length > 0) {
      setChanges((prev) => [...newChanges, ...prev].slice(0, 50));
      setLastSync(Date.now());
    }
  };

  const refreshData = useCallback(async () => {
    setLastSync(Date.now());
    await checkForChanges();
  }, []);

  return {
    changes,
    isOnline,
    lastSync,
    refreshData,
    hasNewChanges: changes.length > 0,
    clearChanges: () => setChanges([]),
  };
}

// Hook for tracking user activity and behavior patterns
export function useUserActivity() {
  const [activity, setActivity] = useState<any[]>([]);
  
  const trackActivity = useCallback(async (action: string, metadata?: any) => {
    const user = await getUser();
    if (!user) return;
    
    // Store activity locally and sync when online
    const newActivity = {
      user_id: user.id,
      action,
      metadata,
      timestamp: Date.now(),
      synced: false,
    };
    
    setActivity((prev) => [newActivity, ...prev].slice(0, 100));
    
    // Sync to server
    try {
      await gqlRequest(
        `
        mutation($userId: uuid!, $action: String!, $metadata: jsonb) {
          insert_user_activity(objects: [{
            user_id: $userId,
            action: $action,
            metadata: $metadata
          }]) {
            affected_rows
          }
        }
      `,
        { userId: user.id, action, metadata }
      );
    } catch (e) {
      console.log("Activity sync failed, will retry later");
    }
  }, []);
  
  return { activity, trackActivity };
}
