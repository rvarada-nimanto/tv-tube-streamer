import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Megaphone, ArrowLeft, Loader2 } from "lucide-react";

const COMPANY_TYPES = [
  { value: "small_business", label: "Small Business" },
  { value: "medium_business", label: "Medium Business" },
  { value: "enterprise", label: "Enterprise" },
  { value: "startup", label: "Startup" },
  { value: "agency", label: "Marketing Agency" },
  { value: "nonprofit", label: "Non-Profit" },
  { value: "other", label: "Other" },
];

export default function SponsorSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    companyType: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    const { error } = await supabase.from("ad_sponsors").insert({
      user_id: user.id,
      company_name: formData.companyName,
      company_type: formData.companyType,
      website: formData.website || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip_code: formData.zipCode || null,
    });

    setIsLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create company profile. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Company Profile Created!",
      description: "You can now start posting ads on store TVs.",
    });

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle>Set Up Your Company</CardTitle>
                <CardDescription>
                  Enter your company details to start posting ads
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Corporation"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                />
              </div>

              {/* Company Type */}
              <div className="space-y-2">
                <Label htmlFor="companyType">Company Type *</Label>
                <Select
                  value={formData.companyType}
                  onValueChange={(v) => setFormData({ ...formData, companyType: v })}
                  required
                >
                  <SelectTrigger id="companyType">
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Street Address (Optional)</Label>
                <Input
                  id="address"
                  placeholder="123 Business Ave"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* City, State, Zip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="CA"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id="zipCode"
                    placeholder="12345"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gradient-primary hover:opacity-90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Create Company Profile"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
