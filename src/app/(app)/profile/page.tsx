"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getUser, gqlRequest, signOut, getAccessToken } from "@/lib/nhost";
import { Camera, LogOut, User, Mail, Globe, DollarSign, Loader2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = [
  { value: "TZS", label: "Tanzanian Shilling (TZS)", flag: "🇹🇿" },
  { value: "USD", label: "US Dollar (USD)", flag: "🇺🇸" },
  { value: "EUR", label: "Euro (EUR)", flag: "🇪🇺" },
  { value: "GBP", label: "British Pound (GBP)", flag: "🇬🇧" },
  { value: "KES", label: "Kenyan Shilling (KES)", flag: "🇰🇪" },
  { value: "UGX", label: "Ugandan Shilling (UGX)", flag: "🇺🇬" },
  { value: "NGN", label: "Nigerian Naira (NGN)", flag: "🇳🇬" },
  { value: "ZAR", label: "South African Rand (ZAR)", flag: "🇿🇦" },
];

const COUNTRIES = [
  { value: "TZ", label: "Tanzania", flag: "🇹🇿" },
  { value: "KE", label: "Kenya", flag: "🇰🇪" },
  { value: "UG", label: "Uganda", flag: "🇺🇬" },
  { value: "NG", label: "Nigeria", flag: "🇳🇬" },
  { value: "ZA", label: "South Africa", flag: "🇿🇦" },
  { value: "US", label: "United States", flag: "🇺🇸" },
  { value: "UK", label: "United Kingdom", flag: "🇬🇧" },
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "AU", label: "Australia", flag: "🇦🇺" },
  { value: "IN", label: "India", flag: "🇮🇳" },
  { value: "OTHER", label: "Other", flag: "🌍" },
];

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [profile, setProfile] = React.useState({
    display_name: "",
    email: "",
    avatar_url: "",
    currency_preference: "TZS",
    country: "TZ",
    phone: "",
  });

  React.useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const user = await getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const result = await gqlRequest(`
      query {
        user_profiles_by_pk(id: "${user.id}") {
          display_name
          email
          avatar_url
          currency_preference
          country
          phone
        }
      }
    `);

    if (result.data?.user_profiles_by_pk) {
      setProfile(result.data.user_profiles_by_pk);
    } else {
      // Set email from auth user
      setProfile(prev => ({ ...prev, email: user.email }));
    }
  }

  async function handleSave() {
    setLoading(true);
    const user = await getUser();
    if (!user) return;

    const result = await gqlRequest(
      `
      mutation($id: uuid!, $display_name: String, $email: String, $avatar_url: String, $currency_preference: String, $country: String, $phone: String) {
        insert_user_profiles_one(object: {
          id: $id,
          display_name: $display_name,
          email: $email,
          avatar_url: $avatar_url,
          currency_preference: $currency_preference,
          country: $country,
          phone: $phone
        }, on_conflict: { constraint: user_profiles_id_key, update_columns: [display_name, email, avatar_url, currency_preference, country, phone] }) {
          id
        }
      }
    `,
      {
        id: user.id,
        display_name: profile.display_name,
        email: profile.email,
        avatar_url: profile.avatar_url,
        currency_preference: profile.currency_preference,
        country: profile.country,
        phone: profile.phone,
      }
    );

    if (result.error) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    }
    setLoading(false);
  }

  async function handleLogout() {
    await signOut();
    router.push("/login");
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file (JPEG, PNG, GIF)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);

    try {
      const user = await getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert to base64 for immediate preview
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update local state for preview
        setProfile(prev => ({ ...prev, avatar_url: base64String }));

        // Upload to Nhost storage
        const token = await getAccessToken();
        const storageUrl = process.env.NEXT_PUBLIC_NHOST_STORAGE_URL || 
          `https://wxtreqbjcljlcoobxoea.storage.eu-central-1.nhost.run/v1`;

        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${storageUrl}/files`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadRes.json();
        const imageUrl = `${storageUrl}/files/${uploadData.id}`;

        // Update profile with new image URL
        await gqlRequest(
          `
          mutation($id: uuid!, $avatar_url: String) {
            insert_user_profiles_one(object: {
              id: $id,
              avatar_url: $avatar_url
            }, on_conflict: { constraint: user_profiles_id_key, update_columns: [avatar_url] }) {
              id
            }
          }
        `,
          { id: user.id, avatar_url: imageUrl }
        );

        setProfile(prev => ({ ...prev, avatar_url: imageUrl }));
        
        toast({
          title: "Success",
          description: "Profile picture updated!",
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Card className="glass-card border-cyan-500/30">
          <CardHeader className="text-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <div className="relative mx-auto mb-4">
              <Avatar className="h-24 w-24 ring-4 ring-cyan-500/30">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-gradient-to-r from-cyan-500 to-blue-600 text-2xl">
                  <User className="h-10 w-10 text-white" />
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={triggerFileInput}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full text-white hover:bg-cyan-400 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
            </div>
            <CardTitle className="text-2xl font-bold text-white">Profile</CardTitle>
            <CardDescription className="text-gray-400">
              Manage your account settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <User className="h-4 w-4" /> Display Name
              </Label>
              <Input
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your name"
                className="bg-[#1e293b] border-white/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input
                value={profile.email}
                disabled
                className="bg-[#1e293b]/50 border-white/20 text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                📞 Phone Number
              </Label>
              <Input
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+255 123 456 789"
                className="bg-[#1e293b] border-white/20 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <Globe className="h-4 w-4" /> Country
              </Label>
              <Select
                value={profile.country}
                onValueChange={(value) => setProfile({ ...profile, country: value })}
              >
                <SelectTrigger className="bg-[#1e293b] border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-300 flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Currency Preference
              </Label>
              <Select
                value={profile.currency_preference}
                onValueChange={(value) => setProfile({ ...profile, currency_preference: value })}
              >
                <SelectTrigger className="bg-[#1e293b] border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.flag} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
