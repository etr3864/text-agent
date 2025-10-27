import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { apiService } from "@/lib/api";

const BASIC_QUESTIONS = [
  {
    id: 'businessName',
    question: "מה שם העסק שלך?",
    placeholder: "הכנס את שם העסק",
    type: 'text',
    required: true
  },
  {
    id: 'businessField',
    question: "באיזה תחום העסק עוסק?",
    placeholder: "למשל: ייעוץ עסקי, מכירות, שירות לקוחות, תכנות, שיווק, וכו'",
    type: 'textarea',
    required: true
  },
  {
    id: 'businessGoal',
    question: "מה המטרה העיקרית של הסוכן?",
    placeholder: "למשל: מכירות, שירות לקוחות, ייעוץ, תמיכה טכנית, קביעת פגישות, וכו'",
    type: 'textarea',
    required: true
  }
];

interface BasicQuestionsStepProps {
  onNext: (answers: { businessName: string; businessField: string; businessGoal: string }) => void;
  onPrevious: () => void;
  initialAnswers?: { businessName: string; businessField: string; businessGoal: string };
  userPhone: string;
}

export const BasicQuestionsStep = ({ onNext, onPrevious, initialAnswers, userPhone }: BasicQuestionsStepProps) => {
  const [answers, setAnswers] = useState({
    businessName: initialAnswers?.businessName || "",
    businessField: initialAnswers?.businessField || "",
    businessGoal: initialAnswers?.businessGoal || ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!answers.businessName.trim()) {
      newErrors.businessName = "שם העסק הוא שדה חובה";
    }

    if (!answers.businessField.trim()) {
      newErrors.businessField = "תחום העסק הוא שדה חובה";
    }

    if (!answers.businessGoal.trim()) {
      newErrors.businessGoal = "מטרת הסוכן היא שדה חובה";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      try {
        // Update user with business name
        await apiService.updateUserBusinessName(userPhone, answers.businessName);
        onNext(answers);
      } catch (error) {
        console.error('Error updating business name:', error);
        // Continue anyway
        onNext(answers);
      }
    }
  };

  const updateAnswer = (field: string, value: string) => {
    setAnswers(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">פרטי העסק</h2>
        <p className="text-muted-foreground" dir="rtl">
          נא למלא את הפרטים הבסיסיים על העסק שלך
        </p>
      </div>

      <div className="space-y-8">
        {BASIC_QUESTIONS.map((question, index) => (
          <div key={question.id} className="space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <Label className="text-lg font-medium text-foreground flex items-start gap-3" dir="rtl">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <span className="pt-1">
                {question.question}
                {question.required && <span className="text-destructive ml-1">*</span>}
              </span>
            </Label>
            
            {question.type === 'text' ? (
              <Input
                value={answers[question.id as keyof typeof answers]}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                placeholder={question.placeholder}
                className={errors[question.id] ? "border-destructive" : ""}
                dir="rtl"
                required={question.required}
              />
            ) : (
              <Textarea
                value={answers[question.id as keyof typeof answers]}
                onChange={(e) => updateAnswer(question.id, e.target.value)}
                placeholder={question.placeholder}
                className={`min-h-[120px] resize-none ${errors[question.id] ? "border-destructive" : ""}`}
                dir="rtl"
                required={question.required}
              />
            )}
            
            {errors[question.id] && (
              <p className="text-sm text-destructive">{errors[question.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onPrevious} variant="outline" className="flex-1 group">
          <ChevronLeft className="ml-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          חזור
        </Button>
        <Button type="submit" className="flex-1 group" variant="default">
          המשך לשאלות מותאמות
          <ChevronRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </form>
  );
};


