import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { apiService } from "@/lib/api";

const QUESTIONS = [
  {
    question: "מה התחום המקצועי שלך?",
    required: true,
    placeholder: "למשל: ייעוץ עסקי, מכירות, שירות לקוחות, תכנות, שיווק, וכו'"
  },
  {
    question: "מה המטרה העיקרית של הסוכן שלך?",
    required: true,
    placeholder: "למשל: מכירות, שירות לקוחות, ייעוץ, תמיכה טכנית, קביעת פגישות, וכו'"
  },
  {
    question: "איזה אופי וסגנון תקשורת אתה רוצה לסוכן?",
    required: true,
    placeholder: "למשל: מקצועי וחמור, מצחיק וקליל, ישיר וקצר, מפורט ומסביר, וכו'"
  },
  {
    question: "איזה שם ומגדר לסוכן?",
    required: false,
    placeholder: "למשל: נועה (נקבה), דוד (זכר), או השאר ריק למערכת לבחור"
  },
  {
    question: "איזה פלטפורמות הסוכן צריך לעבוד בהן?",
    required: false,
    placeholder: "למשל: ווטסאפ, אתר, טלפון, אימייל, וכו'"
  },
  {
    question: "מה המגבלות או הכללים שחשובים לך?",
    required: false,
    placeholder: "למשל: אורך הודעות, שעות פעילות, מה אסור לעשות, וכו'"
  },
  {
    question: "איזה שפה וסגנון תקשורת?",
    required: false,
    placeholder: "למשל: עברית עם סלנג ישראלי, אנגלית, ערבית, וכו'"
  }
];

interface QuestionStepProps {
  onNext: (systemPrompt: string, systemPromptId?: string) => void;
  onPrevious: () => void;
  initialAnswers?: string[];
  userPhone: string;
}

export const QuestionStep = ({ onNext, onPrevious, initialAnswers = [], userPhone }: QuestionStepProps) => {
  const [answers, setAnswers] = useState<string[]>(
    initialAnswers.length === QUESTIONS.length ? initialAnswers : Array(QUESTIONS.length).fill("")
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all required questions are answered
    const requiredQuestions = QUESTIONS.map((q, index) => q.required ? index : -1).filter(index => index !== -1);
    const answeredRequired = requiredQuestions.filter(index => answers[index].trim() !== '');
    
    if (answeredRequired.length !== requiredQuestions.length) {
      setError('אנא ענה על כל השאלות החובה');
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Generate custom system prompt
      const answerTexts = answers
        .filter(answer => answer.trim() !== '')
        .map((answer, index) => `${QUESTIONS[index]}: ${answer}`);

      const response = await apiService.generateCustomSystemPrompt({
        answers: answerTexts,
        userPhone: userPhone
      });

      if (response.success) {
        onNext(response.systemPrompt.prompt, response.systemPrompt.id);
      } else {
        setError('שגיאה ביצירת ה-system prompt');
      }
    } catch (error) {
      console.error('Error generating system prompt:', error);
      setError('שגיאה ביצירת ה-system prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {QUESTIONS.map((questionObj, index) => (
          <div key={index} className="space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <Label className="text-lg font-medium text-foreground flex items-start gap-3" dir="rtl">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <span className="pt-1">
                {questionObj.question}
                {questionObj.required && <span className="text-destructive ml-1">*</span>}
              </span>
            </Label>
            <Textarea
              value={answers[index]}
              onChange={(e) => updateAnswer(index, e.target.value)}
              placeholder={questionObj.placeholder}
              className="min-h-[120px] resize-none"
              dir="rtl"
              required={questionObj.required}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onPrevious} variant="outline" className="flex-1 group">
          <ChevronLeft className="ml-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          חזור
        </Button>
        <Button type="submit" className="flex-1 group" variant="default" disabled={isLoading}>
          {isLoading ? 'יוצר System Prompt...' : 'צור System Prompt'}
          <ChevronRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </form>
  );
};
