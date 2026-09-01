"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getUser, gqlRequest } from "@/lib/nhost";
import { 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Cloud,
  HardDrive
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";

interface BackupData {
  version: string;
  exportDate: string;
  userId: string;
  transactions: any[];
  budgets: any[];
  goals: any[];
  debts: any[];
  userProfile: any;
  userActivity: any[];
}

export default function DataContent() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importProgress, setImportProgress] = React.useState(0);
  const [exportProgress, setExportProgress] = React.useState(0);
  const [dataStats, setDataStats] = React.useState({
    transactions: 0,
    budgets: 0,
    goals: 0,
    debts: 0,
    lastBackup: null as string | null,
  });

  React.useEffect(() => {
    loadDataStats();
  }, []);

  async function loadDataStats() {
    const user = await getUser();
    if (!user) return;

    const [transRes, budgetRes, goalsRes, debtsRes] = await Promise.all([
      gqlRequest(`query { transactions_aggregate(where: {user_id: {_eq: "${user.id}"}}) { aggregate { count } } }`),
      gqlRequest(`query { budgets_aggregate(where: {user_id: {_eq: "${user.id}"}}) { aggregate { count } } }`),
      gqlRequest(`query { goals_aggregate(where: {user_id: {_eq: "${user.id}"}}) { aggregate { count } } }`),
      gqlRequest(`query { debts_aggregate(where: {user_id: {_eq: "${user.id}"}}) { aggregate { count } } }`),
    ]);

    setDataStats({
      transactions: transRes.data?.transactions_aggregate?.aggregate?.count || 0,
      budgets: budgetRes.data?.budgets_aggregate?.aggregate?.count || 0,
      goals: goalsRes.data?.goals_aggregate?.aggregate?.count || 0,
      debts: debtsRes.data?.debts_aggregate?.aggregate?.count || 0,
      lastBackup: localStorage.getItem("lastBackup"),
    });
  }

  async function exportData() {
    setIsExporting(true);
    setExportProgress(10);

    try {
      const user = await getUser();
      if (!user) throw new Error("Not authenticated");

      setExportProgress(30);

      const [transRes, budgetRes, goalsRes, debtsRes, profileRes, activityRes] = await Promise.all([
        gqlRequest(`query { transactions(where: {user_id: {_eq: "${user.id}"}}) { id type amount category date note is_recurring created_at } }`),
        gqlRequest(`query { budgets(where: {user_id: {_eq: "${user.id}"}}) { id category monthly_limit month created_at } }`),
        gqlRequest(`query { goals(where: {user_id: {_eq: "${user.id}"}}) { id name target_amount saved_amount deadline created_at } }`),
        gqlRequest(`query { debts(where: {user_id: {_eq: "${user.id}"}}) { id name amount direction is_paid due_date created_at } }`),
        gqlRequest(`query { user_profiles_by_pk(id: "${user.id}") { id display_name email avatar_url currency_preference country phone created_at } }`),
        gqlRequest(`query { user_activity(where: {user_id: {_eq: "${user.id}"}}, limit: 100, order_by: {created_at: desc}) { id action entity_type entity_id metadata created_at } }`),
      ]);

      setExportProgress(60);

      const backupData: BackupData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        userId: user.id,
        transactions: transRes.data?.transactions || [],
        budgets: budgetRes.data?.budgets || [],
        goals: goalsRes.data?.goals || [],
        debts: debtsRes.data?.debts || [],
        userProfile: profileRes.data?.user_profiles_by_pk || null,
        userActivity: activityRes.data?.user_activity || [],
      };

      setExportProgress(80);

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moneywise-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      localStorage.setItem("emergencyBackup", JSON.stringify(backupData));
      localStorage.setItem("lastBackup", new Date().toISOString());

      setExportProgress(100);
      
      toast({
        title: "Export Complete",
        description: `Exported ${backupData.transactions.length} transactions, ${backupData.budgets.length} budgets, ${backupData.goals.length} goals`,
      });

      loadDataStats();
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setIsExporting(false);
      setExportProgress(0);
    }, 1000);
  }

  async function importData(file: File) {
    setIsImporting(true);
    setImportProgress(10);

    try {
      const text = await file.text();
      setImportProgress(30);

      const data: BackupData = JSON.parse(text);
      
      if (!data.version || !data.userId) {
        throw new Error("Invalid backup file");
      }

      setImportProgress(50);

      const user = await getUser();
      if (!user) throw new Error("Not authenticated");

      if (data.transactions?.length > 0) {
        for (let i = 0; i < data.transactions.length; i++) {
          const t = data.transactions[i];
          await gqlRequest(
            `mutation {
              insert_transactions(objects: [{
                user_id: "${user.id}",
                type: "${t.type}",
                amount: ${t.amount},
                category: "${t.category}",
                date: "${t.date}",
                note: "${t.note || ""}",
                is_recurring: ${t.is_recurring || false}
              }]) {
                affected_rows
              }
            }`
          );
          setImportProgress(50 + Math.floor((i / data.transactions.length) * 20));
        }
      }

      if (data.budgets?.length > 0) {
        for (const b of data.budgets) {
          await gqlRequest(
            `mutation {
              insert_budgets(objects: [{
                user_id: "${user.id}",
                category: "${b.category}",
                monthly_limit: ${b.monthly_limit},
                month: "${b.month}"
              }]) {
                affected_rows
              }
            }`
          );
        }
      }

      setImportProgress(80);

      if (data.goals?.length > 0) {
        for (const g of data.goals) {
          await gqlRequest(
            `mutation {
              insert_goals(objects: [{
                user_id: "${user.id}",
                name: "${g.name}",
                target_amount: ${g.target_amount},
                saved_amount: ${g.saved_amount || 0},
                deadline: "${g.deadline || null}"
              }]) {
                affected_rows
              }
            }`
          );
        }
      }

      if (data.debts?.length > 0) {
        for (const d of data.debts) {
          await gqlRequest(
            `mutation {
              insert_debts(objects: [{
                user_id: "${user.id}",
                name: "${d.name}",
                amount: ${d.amount},
                direction: "${d.direction}",
                is_paid: ${d.is_paid || false},
                due_date: "${d.due_date || null}"
              }]) {
                affected_rows
              }
            }`
          );
        }
      }

      setImportProgress(100);

      toast({
        title: "Import Complete",
        description: `Restored ${data.transactions?.length || 0} transactions, ${data.budgets?.length || 0} budgets, ${data.goals?.length || 0} goals`,
      });

      loadDataStats();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    }

    setTimeout(() => {
      setIsImporting(false);
      setImportProgress(0);
    }, 1000);
  }

  async function clearAllData() {
    try {
      const user = await getUser();
      if (!user) return;

      await Promise.all([
        gqlRequest(`mutation { delete_transactions(where: {user_id: {_eq: "${user.id}"}}) { affected_rows } }`),
        gqlRequest(`mutation { delete_budgets(where: {user_id: {_eq: "${user.id}"}}) { affected_rows } }`),
        gqlRequest(`mutation { delete_goals(where: {user_id: {_eq: "${user.id}"}}) { affected_rows } }`),
        gqlRequest(`mutation { delete_debts(where: {user_id: {_eq: "${user.id}"}}) { affected_rows } }`),
        gqlRequest(`mutation { delete_user_activity(where: {user_id: {_eq: "${user.id}"}}) { affected_rows } }`),
      ]);

      toast({
        title: "Data Cleared",
        description: "All your data has been deleted",
      });

      loadDataStats();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      });
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      importData(file);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Data Management</h1>
          <p className="text-gray-400">Backup, restore, and manage your financial data</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-cyan-400">{dataStats.transactions}</div>
              <div className="text-sm text-gray-400">Transactions</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-purple-400">{dataStats.budgets}</div>
              <div className="text-sm text-gray-400">Budgets</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-400">{dataStats.goals}</div>
              <div className="text-sm text-gray-400">Goals</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-400">{dataStats.debts}</div>
              <div className="text-sm text-gray-400">Debts</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="glass-card border-cyan-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Download className="h-5 w-5 text-cyan-400" />
                Backup Data
              </CardTitle>
              <CardDescription className="text-gray-400">
                Export all your data to a JSON file for safekeeping
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {dataStats.lastBackup && (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  Last backup: {new Date(dataStats.lastBackup).toLocaleDateString()}
                </div>
              )}
              
              {isExporting && (
                <div className="space-y-2">
                  <Progress value={exportProgress} className="h-2" />
                  <p className="text-sm text-gray-400 text-center">{exportProgress}%</p>
                </div>
              )}

              <Button 
                onClick={exportData} 
                disabled={isExporting}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
              >
                {isExporting ? "Exporting..." : "Export to JSON"}
              </Button>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={exportData}
                  disabled={isExporting}
                  className="flex-1 border-white/20 text-gray-300"
                >
                  <FileJson className="h-4 w-4 mr-2" />
                  JSON
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-purple-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Upload className="h-5 w-5 text-purple-400" />
                Restore Data
              </CardTitle>
              <CardDescription className="text-gray-400">
                Import your data from a previous backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-gray-400 text-center">{importProgress}%</p>
                </div>
              )}

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button 
                  disabled={isImporting}
                  className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-600"
                >
                  {isImporting ? "Importing..." : "Select Backup File"}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                Supports MoneyWise JSON backup files
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Database className="h-5 w-5 text-blue-400" />
              Storage Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-[#1e293b]/50 rounded-lg">
                <Cloud className="h-8 w-8 text-cyan-400" />
                <div>
                  <div className="text-sm font-medium text-white">Cloud Storage</div>
                  <div className="text-xs text-gray-400">Nhost Database</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#1e293b]/50 rounded-lg">
                <HardDrive className="h-8 w-8 text-purple-400" />
                <div>
                  <div className="text-sm font-medium text-white">Local Backup</div>
                  <div className="text-xs text-gray-400">Browser Storage</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-[#1e293b]/50 rounded-lg">
                <FileSpreadsheet className="h-8 w-8 text-green-400" />
                <div>
                  <div className="text-sm font-medium text-white">Export Format</div>
                  <div className="text-xs text-gray-400">JSON</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-red-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible actions that affect your data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1e293b] border-red-500/30">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-400">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    This will permanently delete all your transactions, budgets, goals, and debts. 
                    This action cannot be undone. Make sure you have exported your data first.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-transparent border-white/20 text-gray-300">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={clearAllData}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card className="glass-card border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-amber-400 text-sm">💡 Data Safety Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-400 space-y-2">
              <li>• Export your data monthly for safekeeping</li>
              <li>• Store backup files in cloud storage (Google Drive, Dropbox)</li>
              <li>• The app automatically creates emergency backups in browser storage</li>
              <li>• Your data is stored in the cloud and accessible from any device</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
