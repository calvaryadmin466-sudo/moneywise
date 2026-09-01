"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase, getUser } from "@/lib/supabase";
import { AssetType, AssetTypeConfig } from "@/lib/types";
import { fetchDseLivePrices, DsePriceEntry } from "@/lib/dse";
import {
  Wallet,
  Building2,
  Smartphone,
  TrendingUp,
  Banknote,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  FileText,
  Home,
  Car,
  CircleDot,
  Briefcase,
  PawPrint,
  Leaf,
  Box,
  RefreshCw
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Asset {
  id: string;
  type: AssetType;
  name: string;
  balance: number;
  currency: string;
  account_number?: string | null;
  bank_name?: string | null;
  broker_name?: string | null;
  description?: string | null;
  credit_limit?: number | null;
  statement_date?: string | null;
  minimum_payment?: number | null;
  ticker?: string | null;
  shares?: number | null;
  created_at?: string;
  updated_at?: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  Building2,
  Smartphone,
  TrendingUp,
  FileText,
  Home,
  Car,
  CircleDot,
  Briefcase,
  PawPrint,
  Leaf,
  Box,
  PiggyBank,
  Wallet
};

const ASSET_TYPES = Object.entries(AssetTypeConfig).map(([key, config]) => ({
  value: key as AssetType,
  label: config.label,
  icon: ICON_MAP[config.icon] || Box,
  color: `text-[${config.color}]`,
  bgColor: `bg-[${config.color}]/20`,
  hexColor: config.color
}));

export default function AssetsContent() {
  const { toast } = useToast();
  const [assets, setAssets] = React.useState<Asset[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editingAsset, setEditingAsset] = React.useState<Asset | null>(null);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = React.useState(false);
  const [updateAsset, setUpdateAsset] = React.useState<Asset | null>(null);
  const [updateAmount, setUpdateAmount] = React.useState('');
  const [updateType, setUpdateType] = React.useState<'add' | 'subtract'>('add');
  const [newAsset, setNewAsset] = React.useState({
    type: AssetType.CASH,
    name: '',
    balance: '',
    currency: 'TZS',
    account_number: '',
    bank_name: '',
    broker_name: '',
    description: '',
    credit_limit: '',
    statement_date: '',
    minimum_payment: '',
    apr: '',
    ticker: '',
    shares: '',
  });

  const [dsePrices, setDsePrices] = React.useState<DsePriceEntry[]>([]);
  const [loadingPrices, setLoadingPrices] = React.useState(false);
  const [pricesError, setPricesError] = React.useState<string | null>(null);

  const [showTransferDialog, setShowTransferDialog] = React.useState(false);
  const [transfer, setTransfer] = React.useState({
    from_asset_id: '',
    to_asset_id: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
    fee: '',
  });

  React.useEffect(() => {
    loadAssets();
    loadDsePrices();
  }, []);

  // Keep stored balances for DSE-linked stocks in step with the live price,
  // so net worth stays correct on this page and everywhere else that reads `balance`.
  React.useEffect(() => {
    if (dsePrices.length === 0 || assets.length === 0) return;

    const drifted = assets.filter((a) => {
      if (!a.ticker) return false;
      const price = getDsePrice(a.ticker);
      if (!price) return false;
      const liveValue = (Number(a.shares) || 0) * price.price;
      return Math.round(liveValue) !== Math.round(Number(a.balance));
    });
    if (drifted.length === 0) return;

    (async () => {
      const user = await getUser();
      if (!user) return;
      for (const asset of drifted) {
        const price = getDsePrice(asset.ticker);
        if (!price) continue;
        const liveValue = (Number(asset.shares) || 0) * price.price;
        await supabase
          .from('user_assets')
          .update({ balance: liveValue, updated_at: new Date().toISOString() })
          .eq('id', asset.id)
          .eq('user_id', user.id);
      }
      loadAssets();
    })();
  }, [dsePrices, assets]);

  async function loadDsePrices() {
    setLoadingPrices(true);
    try {
      const prices = await fetchDseLivePrices();
      setDsePrices(prices);
      setPricesError(null);
    } catch (error) {
      setPricesError(error instanceof Error ? error.message : "Failed to load live prices");
    } finally {
      setLoadingPrices(false);
    }
  }

  function getDsePrice(ticker?: string | null): DsePriceEntry | undefined {
    return dsePrices.find((p) => p.company === ticker);
  }

  async function loadAssets() {
    const user = await getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setAssets(data);
    if (error) console.error('Error loading assets:', error);
    setLoading(false);
  }

  async function handleAddAsset() {
    const user = await getUser();
    if (!user) return;

    const isDseStock = newAsset.type === AssetType.STOCKS && !!newAsset.ticker;

    if (!newAsset.name || (isDseStock ? !newAsset.shares : !newAsset.balance)) {
      toast({
        title: "Error",
        description: isDseStock ? "Please enter a name and shares held" : "Please enter a name and balance",
        variant: "destructive",
      });
      return;
    }

    let balanceValue = parseFloat(newAsset.balance) || 0;
    if (isDseStock) {
      const priceEntry = getDsePrice(newAsset.ticker);
      if (!priceEntry) {
        toast({
          title: "Error",
          description: "Live price unavailable for that ticker, try refreshing prices",
          variant: "destructive",
        });
        return;
      }
      balanceValue = (parseFloat(newAsset.shares) || 0) * priceEntry.price;
    }

    const { data, error } = await supabase
      .from('user_assets')
      .insert({
        user_id: user.id,
        type: newAsset.type,
        name: newAsset.name,
        balance: balanceValue,
        currency: newAsset.currency,
        account_number: newAsset.account_number || null,
        bank_name: newAsset.bank_name || null,
        broker_name: newAsset.broker_name || null,
        description: newAsset.description || null,
        credit_limit: newAsset.credit_limit ? parseFloat(newAsset.credit_limit) : null,
        statement_date: newAsset.statement_date || null,
        minimum_payment: newAsset.minimum_payment ? parseFloat(newAsset.minimum_payment) : null,
        ticker: isDseStock ? newAsset.ticker : null,
        shares: isDseStock ? (parseFloat(newAsset.shares) || 0) : null,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Asset added successfully",
      });
      setShowAddDialog(false);
      setNewAsset({
        type: AssetType.CASH,
        name: '',
        balance: '',
        currency: 'TZS',
        account_number: '',
        bank_name: '',
        broker_name: '',
        description: '',
        credit_limit: '',
        statement_date: '',
        minimum_payment: '',
        apr: '',
        ticker: '',
        shares: '',
      });
      loadAssets();
    }
  }

  async function handleSyncStockValue(asset: Asset, newBalance: number) {
    const user = await getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_assets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', asset.id)
      .eq('user_id', user.id);

    if (!error) {
      toast({ title: "Synced", description: `${asset.name} updated to live market value` });
      loadAssets();
    }
  }

  async function handleTransfer() {
    const user = await getUser();
    if (!user) return;

    if (!transfer.from_asset_id || !transfer.to_asset_id || !transfer.amount) {
      toast({ title: "Error", description: "Select accounts and enter an amount", variant: "destructive" });
      return;
    }
    if (transfer.from_asset_id === transfer.to_asset_id) {
      toast({ title: "Error", description: "Select different source and destination accounts", variant: "destructive" });
      return;
    }

    const amount = parseFloat(transfer.amount);
    const fee = parseFloat(transfer.fee) || 0;
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Error", description: "Enter a valid amount", variant: "destructive" });
      return;
    }

    const source = assets.find(a => a.id === transfer.from_asset_id);
    if (!source) return;
    if (Number(source.balance) < amount + fee) {
      toast({ title: "Error", description: "Insufficient balance in source account", variant: "destructive" });
      return;
    }

    const { data: txData, error: txError } = await supabase.rpc('create_transfer_transactions', {
      p_user_id: user.id,
      p_from_asset_id: transfer.from_asset_id,
      p_to_asset_id: transfer.to_asset_id,
      p_amount: amount,
      p_fee: fee,
      p_date: transfer.date,
      p_note: transfer.note || null,
    });

    if (!txError && txData) {
      toast({ title: "Transfer complete", description: `Moved ${formatCurrencySimple(amount, source.currency)}` });
      setShowTransferDialog(false);
      setTransfer({
        from_asset_id: '',
        to_asset_id: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        note: '',
        fee: '',
      });
      loadAssets();
      return;
    }

    const fallbackSource = Number(source.balance) - amount - fee;
    const destAsset = assets.find(a => a.id === transfer.to_asset_id);
    const fallbackDest = Number(destAsset?.balance || 0) + amount;

    const { error: u1 } = await supabase.from('user_assets')
      .update({ balance: fallbackSource, updated_at: new Date().toISOString() })
      .eq('id', transfer.from_asset_id).eq('user_id', user.id);
    const { error: u2 } = await supabase.from('user_assets')
      .update({ balance: fallbackDest, updated_at: new Date().toISOString() })
      .eq('id', transfer.to_asset_id).eq('user_id', user.id);

    if (!u1 && !u2) {
      toast({ title: "Transfer complete (balances updated)", description: `Moved ${formatCurrencySimple(amount, source.currency)}` });
      setShowTransferDialog(false);
      setTransfer({
        from_asset_id: '',
        to_asset_id: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        note: '',
        fee: '',
      });
      loadAssets();
    } else {
      toast({ title: "Transfer failed", description: u1?.message || u2?.message || "Unknown error", variant: "destructive" });
    }
  }

  function formatCurrencySimple(amount: number, currency: string) {
    return `${currency} ${amount.toLocaleString()}`;
  }

  async function handleUpdateBalance() {
    if (!updateAsset || !updateAmount) return;

    const user = await getUser();
    if (!user) return;

    const amount = parseFloat(updateAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (updateAsset.ticker) {
      const currentShares = Number(updateAsset.shares) || 0;
      const newShares = updateType === 'add' ? currentShares + amount : currentShares - amount;

      if (newShares < 0) {
        toast({ title: "Error", description: "Not enough shares to sell", variant: "destructive" });
        return;
      }

      const price = getDsePrice(updateAsset.ticker);
      const newBalance = price ? newShares * price.price : updateAsset.balance;

      const { error } = await supabase
        .from('user_assets')
        .update({ shares: newShares, balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', updateAsset.id)
        .eq('user_id', user.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({
          title: "Success",
          description: `${updateType === 'add' ? 'Bought' : 'Sold'} ${amount} shares of ${updateAsset.ticker}`,
        });
        setShowUpdateDialog(false);
        setUpdateAmount('');
        loadAssets();
      }
      return;
    }

    const newBalance = updateType === 'add'
      ? updateAsset.balance + amount
      : updateAsset.balance - amount;

    if (newBalance < 0) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('user_assets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', updateAsset.id)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Balance updated! ${updateType === 'add' ? 'Added' : 'Subtracted'} ${amount}`,
      });
      setShowUpdateDialog(false);
      setUpdateAmount('');
      loadAssets();
    }
  }

  async function handleDeleteAsset(assetId: string) {
    const user = await getUser();
    if (!user) return;
    
    const { error } = await supabase
      .from('user_assets')
      .delete()
      .eq('id', assetId)
      .eq('user_id', user.id);

    if (!error) {
      toast({
        title: "Deleted",
        description: "Asset removed successfully",
      });
      loadAssets();
    }
  }

  function getDisplayBalance(asset: Asset): number {
    if (asset.ticker) {
      const price = getDsePrice(asset.ticker);
      if (price) return (Number(asset.shares) || 0) * price.price;
    }
    return Number(asset.balance);
  }

  const totalBalance = assets.reduce((sum, asset) => sum + getDisplayBalance(asset), 0);

  function getAssetTypeConfig(type: string) {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[4];
  }

  return (
    <main className="flex-1 space-y-6 bg-background/50 p-4 sm:p-6 overflow-x-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Wallet className="h-8 w-8 text-cyan-400" />
              My Assets
            </h1>
            <p className="text-gray-400 mt-1">Track your money across all accounts</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600">
                <Plus className="h-4 w-4 mr-2" /> Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1e293b] border-white/10 text-white max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Asset</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Asset Type</Label>
                  <Select
                    value={newAsset.type}
                    onValueChange={(v) => setNewAsset({ ...newAsset, type: v as Asset['type'] })}
                  >
                    <SelectTrigger className="bg-[#0f172a] border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            <t.icon className={`h-4 w-4 ${t.color}`} />
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder={newAsset.type === AssetType.CASH ? 'Cash in Wallet' : newAsset.type === AssetType.BANK_ACCOUNT ? 'CRDB Bank' : 'M-Pesa'}
                    className="bg-[#0f172a] border-white/20 text-white"
                  />
                </div>

                {newAsset.type === AssetType.BANK_ACCOUNT && (
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input
                      value={newAsset.bank_name}
                      onChange={(e) => setNewAsset({ ...newAsset, bank_name: e.target.value })}
                      placeholder="CRDB, NMB, etc."
                      className="bg-[#0f172a] border-white/20 text-white"
                    />
                  </div>
                )}

                {(newAsset.type === AssetType.BANK_ACCOUNT || newAsset.type === AssetType.MOBILE_MONEY) && (
                  <div className="space-y-2">
                    <Label>Account/Phone Number</Label>
                    <Input
                      value={newAsset.account_number}
                      onChange={(e) => setNewAsset({ ...newAsset, account_number: e.target.value })}
                      placeholder={newAsset.type === AssetType.MOBILE_MONEY ? '07XX XXX XXX' : 'Account number'}
                      className="bg-[#0f172a] border-white/20 text-white"
                    />
                  </div>
                )}

                {newAsset.type === AssetType.STOCKS && (
                  <>
                    <div className="space-y-2">
                      <Label>Broker/Platform</Label>
                      <Input
                        value={newAsset.broker_name}
                        onChange={(e) => setNewAsset({ ...newAsset, broker_name: e.target.value })}
                        placeholder="e.g., DSE, Hisa, etc."
                        className="bg-[#0f172a] border-white/20 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>DSE Ticker (optional, for live pricing)</Label>
                        <button
                          type="button"
                          onClick={loadDsePrices}
                          className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
                          disabled={loadingPrices}
                          title="Refresh live prices"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingPrices ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                      <Select
                        value={newAsset.ticker}
                        onValueChange={(v) => setNewAsset({
                          ...newAsset,
                          ticker: v === '__none__' ? '' : v,
                          currency: v === '__none__' ? newAsset.currency : 'TZS',
                        })}
                      >
                        <SelectTrigger className="bg-[#0f172a] border-white/20 text-white">
                          <SelectValue placeholder="Not listed on DSE" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not listed / enter value manually</SelectItem>
                          {dsePrices.map((p) => (
                            <SelectItem key={p.company} value={p.company}>
                              {p.company} — TZS {p.price.toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {pricesError && (
                        <p className="text-xs text-amber-400">{pricesError}</p>
                      )}
                    </div>

                    {newAsset.ticker && (
                      <div className="space-y-2">
                        <Label>Shares Held</Label>
                        <Input
                          type="text"
                          value={newAsset.shares}
                          onChange={(e) => setNewAsset({ ...newAsset, shares: e.target.value.replace(/[^0-9.]/g, '') })}
                          placeholder="e.g., 500"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                        {newAsset.shares && getDsePrice(newAsset.ticker) && (
                          <p className="text-xs text-gray-400">
                            ≈ TZS {((parseFloat(newAsset.shares) || 0) * (getDsePrice(newAsset.ticker)?.price || 0)).toLocaleString()} at current price
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {newAsset.type === AssetType.CREDIT_CARD && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Issuing Bank</Label>
                        <Input
                          value={newAsset.bank_name}
                          onChange={(e) => setNewAsset({ ...newAsset, bank_name: e.target.value })}
                          placeholder="e.g., Visa, Mastercard, Amex"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Last 4 digits / Ref</Label>
                        <Input
                          value={newAsset.account_number}
                          onChange={(e) => setNewAsset({ ...newAsset, account_number: e.target.value })}
                          placeholder="e.g., ****-4521"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Credit Limit</Label>
                        <Input
                          type="text"
                          value={newAsset.credit_limit}
                          onChange={(e) => setNewAsset({ ...newAsset, credit_limit: e.target.value.replace(/[^0-9.]/g, '') })}
                          placeholder="0.00"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>APR % (Optional)</Label>
                        <Input
                          type="text"
                          value={newAsset.apr}
                          onChange={(e) => setNewAsset({ ...newAsset, apr: e.target.value.replace(/[^0-9.]/g, '') })}
                          placeholder="e.g., 24.9"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Next Statement Date</Label>
                        <Input
                          type="date"
                          value={newAsset.statement_date}
                          onChange={(e) => setNewAsset({ ...newAsset, statement_date: e.target.value })}
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Minimum Payment</Label>
                        <Input
                          type="text"
                          value={newAsset.minimum_payment}
                          onChange={(e) => setNewAsset({ ...newAsset, minimum_payment: e.target.value.replace(/[^0-9.]/g, '') })}
                          placeholder="0.00"
                          className="bg-[#0f172a] border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                      <p>💳 Credit card balance should reflect the current amount owed (negative equity).</p>
                      <p>Set credit limit to track available credit vs utilisation.</p>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {newAsset.type === AssetType.STOCKS && newAsset.ticker ? (
                    <div className="space-y-2">
                      <Label>Current Balance (auto)</Label>
                      <div className="bg-[#0f172a] border border-white/20 rounded-md text-lg min-w-[200px] px-3 py-2 text-white">
                        TZS {((parseFloat(newAsset.shares) || 0) * (getDsePrice(newAsset.ticker)?.price || 0)).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Current Balance</Label>
                      <Input
                        type="text"
                        value={newAsset.balance}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          setNewAsset({ ...newAsset, balance: value });
                        }}
                        placeholder="0.00"
                        className="bg-[#0f172a] border-white/20 text-white text-lg min-w-[200px]"
                        style={{ fontSize: '1.125rem', padding: '0.75rem' }}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={newAsset.currency}
                      onValueChange={(v) => setNewAsset({ ...newAsset, currency: v })}
                    >
                      <SelectTrigger className="bg-[#0f172a] border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TZS">TZS</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KES">KES</SelectItem>
                        <SelectItem value="UGX">UGX</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Input
                    value={newAsset.description}
                    onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                    placeholder="Notes about this account..."
                    className="bg-[#0f172a] border-white/20 text-white"
                  />
                </div>

                <Button onClick={handleAddAsset} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600">
                  <Save className="h-4 w-4 mr-2" /> Save Asset
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => setShowTransferDialog(true)}
            className="border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
            disabled={assets.length < 2}
          >
            <ArrowUpRight className="h-4 w-4 mr-2 rotate-180" />
            Transfer
          </Button>

          {assets.some(a => a.ticker) && (
            <Button
              variant="outline"
              onClick={loadDsePrices}
              disabled={loadingPrices}
              className="border-white/20 text-gray-300 hover:bg-white/5"
              title="Refresh DSE live prices"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPrices ? 'animate-spin' : ''}`} />
              Refresh Prices
            </Button>
          )}
        </div>

        <Card className="glass-card border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-blue-500/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Net Worth</p>
                <p className="text-3xl font-bold text-white">
                  TZS {totalBalance.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-cyan-500/20 rounded-full">
                <Wallet className="h-8 w-8 text-cyan-400" />
              </div>
            </div>
            <div className="mt-4 flex gap-4 text-sm text-gray-400">
              <span>{assets.length} asset{assets.length !== 1 ? 's' : ''}</span>
              <span>•</span>
              <span>{ASSET_TYPES.filter(t => assets.some(a => a.type === t.value)).length} type{ASSET_TYPES.filter(t => assets.some(a => a.type === t.value)).length !== 1 ? 's' : ''}</span>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-400">Loading assets...</p>
          </div>
        ) : assets.length === 0 ? (
          <Card className="glass-card border-dashed border-white/20">
            <CardContent className="p-12 text-center">
              <Wallet className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No assets yet</h3>
              <p className="text-gray-400 mb-4">Add your cash, bank accounts, mobile money, or stocks</p>
              <Button onClick={() => setShowAddDialog(true)} variant="outline" className="border-white/20 text-gray-300">
                <Plus className="h-4 w-4 mr-2" /> Add Your First Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assets.map((asset) => {
              const typeConfig = getAssetTypeConfig(asset.type);
              const Icon = typeConfig.icon;
              const isCreditCard = asset.type === 'credit_card';
              const creditLimit = asset.credit_limit ? Number(asset.credit_limit) : 0;
              const balance = Number(asset.balance);
              const utilization = creditLimit > 0 ? Math.min((balance / creditLimit) * 100, 100) : 0;
              const availableCredit = Math.max(creditLimit - balance, 0);
              const utilStatus = utilization >= 90 ? 'text-rose-400' : utilization >= 70 ? 'text-amber-400' : 'text-emerald-400';
              const utilBg = utilization >= 90 ? '[&>div]:bg-rose-500' : utilization >= 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-emerald-500';
              const dsePrice = asset.type === AssetType.STOCKS && asset.ticker ? getDsePrice(asset.ticker) : undefined;
              const stockShares = Number(asset.shares) || 0;
              const stockLiveValue = dsePrice ? stockShares * dsePrice.price : null;

              return (
                <Card key={asset.id} className={`glass-card hover:border-cyan-500/30 transition-colors ${isCreditCard ? 'border-pink-500/20' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isCreditCard ? 'bg-pink-500/20' : typeConfig.bgColor}`}>
                          <Icon className={`h-6 w-6 ${isCreditCard ? 'text-pink-400' : typeConfig.color}`} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-white">{asset.name}</h3>
                            {isCreditCard && (
                              <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-[10px] h-5">Credit</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                            <span>{typeConfig.label}</span>
                            {asset.bank_name && <span>• {asset.bank_name}</span>}
                            {asset.account_number && <span>• {asset.account_number}</span>}
                            {asset.broker_name && <span>• {asset.broker_name}</span>}
                            {asset.ticker && <span>• {asset.ticker}</span>}
                            {isCreditCard && (asset as any).apr && <span>• APR {(asset as any).apr}%</span>}
                            {isCreditCard && asset.statement_date && <span>• stmt {asset.statement_date}</span>}
                          </div>
                          {asset.description && (
                            <p className="text-xs text-gray-500 mt-1 truncate">{asset.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-white">
                          {asset.currency} {getDisplayBalance(asset).toLocaleString()}
                        </p>
                        {isCreditCard && creditLimit > 0 && (
                          <p className={`text-xs mt-0.5 ${utilStatus}`}>
                            {utilization.toFixed(0)}% utilised • avail {formatCurrencySimple(availableCredit, asset.currency)}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUpdateAsset(asset);
                              setUpdateType('add');
                              setShowUpdateDialog(true);
                            }}
                            className="h-8 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            title={asset.ticker ? 'Buy shares' : isCreditCard ? 'Make payment (reduce owed)' : 'Add money'}
                          >
                            <ArrowDownLeft className="h-4 w-4 mr-1" />
                            {asset.ticker ? 'Buy' : isCreditCard ? 'Pay' : 'Add'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setUpdateAsset(asset);
                              setUpdateType('subtract');
                              setShowUpdateDialog(true);
                            }}
                            className="h-8 px-2 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            title={asset.ticker ? 'Sell shares' : isCreditCard ? 'Make purchase (increase owed)' : 'Use money'}
                          >
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            {asset.ticker ? 'Sell' : isCreditCard ? 'Charge' : 'Use'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAsset(asset.id)}
                            className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    {isCreditCard && creditLimit > 0 && (
                      <div className="pt-1 space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-400">
                          <span>Limit {formatCurrencySimple(creditLimit, asset.currency)}</span>
                          <span>
                            {asset.minimum_payment ? `Min pay ${formatCurrencySimple(Number(asset.minimum_payment), asset.currency)}` : ''}
                          </span>
                        </div>
                        <Progress value={utilization} className={`h-1.5 ${utilBg}`} />
                      </div>
                    )}
                    {asset.ticker && (
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">{stockShares.toLocaleString()} shares</span>
                        {dsePrice ? (
                          <div className="flex items-center gap-2">
                            <span className={dsePrice.change > 0 ? 'text-emerald-400' : dsePrice.change < 0 ? 'text-rose-400' : 'text-gray-400'}>
                              TZS {dsePrice.price.toLocaleString()}/share
                              {dsePrice.change !== 0 && ` (${dsePrice.change > 0 ? '+' : ''}${dsePrice.change})`}
                            </span>
                            {stockLiveValue !== null && Math.round(stockLiveValue) !== Math.round(Number(asset.balance)) && (
                              <button
                                type="button"
                                onClick={() => handleSyncStockValue(asset, stockLiveValue)}
                                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                                title={`Sync stored balance to live value (TZS ${stockLiveValue.toLocaleString()})`}
                              >
                                Sync to TZS {stockLiveValue.toLocaleString()}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            {pricesError ? 'Live price unavailable' : 'Loading price...'}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>
                {updateAsset?.ticker
                  ? `${updateType === 'add' ? 'Buy' : 'Sell'} ${updateAsset.ticker} Shares`
                  : `${updateType === 'add' ? 'Add Money' : 'Use Money'}`} - {updateAsset?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-[#0f172a] rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-400">{updateAsset?.ticker ? 'Current Shares' : 'Current Balance'}</p>
                  <p className="text-xl font-bold text-white">
                    {updateAsset?.ticker
                      ? (Number(updateAsset.shares) || 0).toLocaleString()
                      : `${updateAsset?.currency} ${updateAsset?.balance.toLocaleString()}`}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{updateAsset?.ticker ? `Shares to ${updateType === 'add' ? 'Buy' : 'Sell'}` : `Amount to ${updateType === 'add' ? 'Add' : 'Use'}`}</Label>
                <Input
                  type="text"
                  value={updateAmount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    setUpdateAmount(value);
                  }}
                  placeholder={updateAsset?.ticker ? 'e.g., 100' : '0.00'}
                  className="bg-[#0f172a] border-white/20 text-white text-lg min-w-[200px]"
                  style={{ fontSize: '1.125rem', padding: '0.75rem' }}
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUpdateType('add')}
                  className={`flex-1 ${updateType === 'add' ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'border-white/20 text-gray-400'}`}
                >
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  {updateAsset?.ticker ? 'Buy' : 'Received'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUpdateType('subtract')}
                  className={`flex-1 ${updateType === 'subtract' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/20 text-gray-400'}`}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {updateAsset?.ticker ? 'Sell' : 'Used'}
                </Button>
              </div>

              <Button
                onClick={handleUpdateBalance}
                className={`w-full ${updateType === 'add' ? 'bg-green-600 hover:bg-green-500' : 'bg-amber-600 hover:bg-amber-500'}`}
              >
                {updateAsset?.ticker
                  ? (updateType === 'add' ? 'Buy Shares' : 'Sell Shares')
                  : (updateType === 'add' ? 'Add Money' : 'Subtract Money')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-400" />
                Transfer Between Accounts
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">From (Source)</Label>
                  <Select
                    value={transfer.from_asset_id}
                    onValueChange={(v) => setTransfer({ ...transfer, from_asset_id: v })}
                  >
                    <SelectTrigger className="bg-[#0f172a] border-white/20 text-white h-11">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} — {a.currency} {Number(a.balance).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">To (Destination)</Label>
                  <Select
                    value={transfer.to_asset_id}
                    onValueChange={(v) => setTransfer({ ...transfer, to_asset_id: v })}
                  >
                    <SelectTrigger className="bg-[#0f172a] border-white/20 text-white h-11">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((a) => (
                        <SelectItem key={a.id} value={a.id} disabled={a.id === transfer.from_asset_id}>
                          {a.name} — {a.currency} {Number(a.balance).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={transfer.amount}
                    onChange={(e) => setTransfer({ ...transfer, amount: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="0.00"
                    className="bg-[#0f172a] border-white/20 text-white h-11 text-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-gray-400">Fee (optional)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={transfer.fee}
                    onChange={(e) => setTransfer({ ...transfer, fee: e.target.value.replace(/[^0-9.]/g, '') })}
                    placeholder="0.00"
                    className="bg-[#0f172a] border-white/20 text-white h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Date</Label>
                <Input
                  type="date"
                  value={transfer.date}
                  onChange={(e) => setTransfer({ ...transfer, date: e.target.value })}
                  className="bg-[#0f172a] border-white/20 text-white h-11"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-gray-400">Note / Memo</Label>
                <Input
                  value={transfer.note}
                  onChange={(e) => setTransfer({ ...transfer, note: e.target.value })}
                  placeholder="e.g., ATM withdrawal, M-Pesa top-up"
                  className="bg-[#0f172a] border-white/20 text-white h-11"
                />
              </div>

              {transfer.from_asset_id && transfer.to_asset_id && transfer.amount && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs space-y-1">
                  <div className="flex justify-between text-gray-400">
                    <span>Source after transfer</span>
                    <span className="text-white">
                      {(() => {
                        const src = assets.find(a => a.id === transfer.from_asset_id);
                        if (!src) return '-';
                        const amt = parseFloat(transfer.amount) || 0;
                        const fee = parseFloat(transfer.fee) || 0;
                        return `${src.currency} ${(Number(src.balance) - amt - fee).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Destination after</span>
                    <span className="text-white">
                      {(() => {
                        const dst = assets.find(a => a.id === transfer.to_asset_id);
                        if (!dst) return '-';
                        const amt = parseFloat(transfer.amount) || 0;
                        return `${dst.currency} ${(Number(dst.balance) + amt).toLocaleString()}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              <Button onClick={handleTransfer} className="w-full h-11 bg-gradient-to-r from-cyan-500 to-blue-600">
                <ArrowUpRight className="h-4 w-4 mr-2 rotate-180" />
                Execute Transfer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="glass-card border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-400 text-sm">💡 How to use</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Click <strong>"Add"</strong> / <strong>"Pay"</strong> when you receive money or make a credit card payment</li>
              <li>• Click <strong>"Use"</strong> / <strong>"Charge"</strong> when you spend or use your credit card</li>
              <li>• Use <strong>"Transfer"</strong> to move money between accounts (bank ↔ mobile, card payments, etc.)</li>
              <li>• Total shows your combined net worth across all assets</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
