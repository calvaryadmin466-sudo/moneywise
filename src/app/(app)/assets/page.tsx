"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase, getUser } from "@/lib/supabase";
import { AssetType, AssetTypeConfig } from "@/lib/types";
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
  Box
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";

interface Asset {
  id: string;
  asset_type: AssetType;
  name: string;
  current_value: number;
  purchase_value?: number;
  currency: string;
  account_number?: string;
  bank_name?: string;
  broker_name?: string;
  description?: string;
  icon_name?: string;
  color_hex?: string;
}

// Icon mapping for dynamic rendering
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

export default function AssetsPage() {
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
    asset_type: AssetType.CASH,
    name: '',
    current_value: '',
    purchase_value: '',
    currency: 'TZS',
    account_number: '',
    bank_name: '',
    broker_name: '',
    description: '',
  });

  React.useEffect(() => {
    loadAssets();
  }, []);

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

    if (!newAsset.name || !newAsset.balance) {
      toast({
        title: "Error",
        description: "Please enter a name and balance",
        variant: "destructive",
      });
      return;
    }

    // Insert asset using Supabase
    const { data, error } = await supabase
      .from('user_assets')
      .insert({
        user_id: user.id,
        type: newAsset.type,
        name: newAsset.name,
        balance: parseFloat(newAsset.balance),
        currency: newAsset.currency,
        account_number: newAsset.account_number || null,
        bank_name: newAsset.bank_name || null,
        broker_name: newAsset.broker_name || null,
        description: newAsset.description || null,
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
        type: 'cash',
        name: '',
        balance: '',
        currency: 'TZS',
        account_number: '',
        bank_name: '',
        broker_name: '',
        description: '',
      });
      loadAssets();
    }
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

    // Update using Supabase
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
    
    // Delete using Supabase
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

  const totalBalance = assets.reduce((sum, asset) => sum + asset.balance, 0);

  function getAssetTypeConfig(type: string) {
    return ASSET_TYPES.find(t => t.value === type) || ASSET_TYPES[4];
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
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
                    placeholder={newAsset.type === 'cash' ? 'Cash in Wallet' : newAsset.type === 'bank' ? 'CRDB Bank' : 'M-Pesa'}
                    className="bg-[#0f172a] border-white/20 text-white"
                  />
                </div>

                {newAsset.type === 'bank' && (
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

                {(newAsset.type === 'bank' || newAsset.type === 'mobile_money') && (
                  <div className="space-y-2">
                    <Label>Account/Phone Number</Label>
                    <Input
                      value={newAsset.account_number}
                      onChange={(e) => setNewAsset({ ...newAsset, account_number: e.target.value })}
                      placeholder={newAsset.type === 'mobile_money' ? '07XX XXX XXX' : 'Account number'}
                      className="bg-[#0f172a] border-white/20 text-white"
                    />
                  </div>
                )}

                {newAsset.type === 'stocks' && (
                  <div className="space-y-2">
                    <Label>Broker/Platform</Label>
                    <Input
                      value={newAsset.broker_name}
                      onChange={(e) => setNewAsset({ ...newAsset, broker_name: e.target.value })}
                      placeholder="e.g., DSE, Hisa, etc."
                      className="bg-[#0f172a] border-white/20 text-white"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Current Balance</Label>
                    <Input
                      type="number"
                      value={newAsset.balance}
                      onChange={(e) => setNewAsset({ ...newAsset, balance: e.target.value })}
                      placeholder="0.00"
                      className="bg-[#0f172a] border-white/20 text-white"
                    />
                  </div>
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
        </div>

        {/* Total Card */}
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

        {/* Assets List */}
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
              
              return (
                <Card key={asset.id} className="glass-card hover:border-cyan-500/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${typeConfig.bgColor}`}>
                          <Icon className={`h-6 w-6 ${typeConfig.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{asset.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>{typeConfig.label}</span>
                            {asset.bank_name && <span>• {asset.bank_name}</span>}
                            {asset.account_number && <span>• {asset.account_number}</span>}
                            {asset.broker_name && <span>• {asset.broker_name}</span>}
                          </div>
                          {asset.description && (
                            <p className="text-xs text-gray-500 mt-1">{asset.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-white">
                          {asset.currency} {asset.balance.toLocaleString()}
                        </p>
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
                          >
                            <ArrowDownLeft className="h-4 w-4 mr-1" />
                            Add
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
                          >
                            <ArrowUpRight className="h-4 w-4 mr-1" />
                            Use
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
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Update Balance Dialog */}
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="bg-[#1e293b] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>
                {updateType === 'add' ? 'Add Money' : 'Use Money'} - {updateAsset?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-[#0f172a] rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-gray-400">Current Balance</p>
                  <p className="text-xl font-bold text-white">
                    {updateAsset?.currency} {updateAsset?.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Amount to {updateType === 'add' ? 'Add' : 'Use'}</Label>
                <Input
                  type="number"
                  value={updateAmount}
                  onChange={(e) => setUpdateAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-[#0f172a] border-white/20 text-white text-lg"
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
                  Received
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setUpdateType('subtract')}
                  className={`flex-1 ${updateType === 'subtract' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'border-white/20 text-gray-400'}`}
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Used
                </Button>
              </div>

              <Button 
                onClick={handleUpdateBalance} 
                className={`w-full ${updateType === 'add' ? 'bg-green-600 hover:bg-green-500' : 'bg-amber-600 hover:bg-amber-500'}`}
              >
                {updateType === 'add' ? 'Add Money' : 'Subtract Money'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tips */}
        <Card className="glass-card border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-400 text-sm">💡 How to use</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Click <strong>"Add"</strong> when you receive money (salary, payment, etc.)</li>
              <li>• Click <strong>"Use"</strong> when you spend from this account</li>
              <li>• Total shows your combined net worth across all assets</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
