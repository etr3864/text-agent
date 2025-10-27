import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import { apiService } from "@/lib/api";

interface PersonalInfoStepProps {
  onNext: (data: { name: string; phone: string; businessName: string }) => void;
  initialData?: { name: string; phone: string; businessName: string };
}

export const PersonalInfoStep = ({ onNext, initialData }: PersonalInfoStepProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    phone: initialData?.phone || "",
    businessName: initialData?.businessName || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "שם הוא שדה חובה";
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = "מספר WhatsApp הוא שדה חובה";
    } else if (!/^972[0-9]{8,9}$/.test(formData.phone)) {
      newErrors.phone = "פורמט WhatsApp לא תקין (דוגמה: 972509039899)";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsLoading(true);
      try {
        // Create user in backend
        await apiService.createUser({
          phone_number: formData.phone,
          name: formData.name
        });
        onNext(formData);
      } catch (error) {
        console.error('Error creating user:', error);
        setErrors({ general: 'שגיאה בשמירת הפרטים' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6 animate-in fade-in duration-500">
      {errors.general && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {errors.general}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name" className="text-foreground">שם מלא *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="הכנס מספר לקוח"
          className={errors.name ? "border-destructive" : ""}
          dir="rtl"
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone" className="text-foreground">מספר WhatsApp *</Label>
        <Input
          id="phone"
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="972509039899"
          className={errors.phone ? "border-destructive" : ""}
          dir="ltr"
        />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
        <p className="text-xs text-muted-foreground">📱 פורמט WhatsApp לשליחת הודעות</p>
      </div>

      <Button type="submit" className="w-full group" variant="default" disabled={isLoading}>
        {isLoading ? 'שומר פרטים...' : 'המשך לשאלון'}
        <ChevronRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Button>
    </form>
  );
};
