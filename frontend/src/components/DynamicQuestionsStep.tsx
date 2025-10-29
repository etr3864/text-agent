import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Loader2, Upload, FileText } from "lucide-react";
import { apiService } from "@/lib/api";

interface DynamicQuestionsStepProps {
  onNext: (systemPrompt: string, systemPromptId?: string) => void;
  onPrevious: () => void;
  basicAnswers: {
    businessName: string;
    businessField: string;
    businessGoal: string;
  };
  initialAnswers?: string[];
  userPhone: string;
  customerGender: string;
}

export const DynamicQuestionsStep = ({ 
  onNext, 
  onPrevious, 
  basicAnswers, 
  initialAnswers = [],
  userPhone,
  customerGender
}: DynamicQuestionsStepProps) => {
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [openInstructions, setOpenInstructions] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    generateQuestions();
  }, []);

  const generateQuestions = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiService.generateDynamicQuestions(basicAnswers);
      
      if (response.success && response.questions) {
        setQuestions(response.questions);
        setAnswers(Array(response.questions.length).fill(""));
      } else {
        setError('שגיאה ביצירת השאלות');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      setError('שגיאה ביצירת השאלות');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('אנא העלה קובץ PDF בלבד');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('גודל הקובץ חייב להיות פחות מ-5MB');
      return;
    }

    setPdfFile(file);
    setIsUploadingPdf(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await apiService.parsePdf(formData);
      setPdfText(response.text);
    } catch (error) {
      console.error('Error uploading PDF:', error);
      setError('שגיאה בהעלאת הקובץ');
    } finally {
      setIsUploadingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if all questions are answered
    const unansweredQuestions = answers.filter(answer => answer.trim() === '');
    
    if (unansweredQuestions.length > 0) {
      setError('אנא ענה על כל השאלות');
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      // Combine basic answers with dynamic answers
      const allAnswers = [
        `שם העסק: ${basicAnswers.businessName}`,
        `תחום עיסוק: ${basicAnswers.businessField}`,
        `מטרת הסוכן: ${basicAnswers.businessGoal}`,
        `מגדר הלקוח: ${customerGender}`,
        ...answers.map((answer, index) => `שאלה מותאמת ${index + 1}: ${answer}`)
      ];

      // Add open instructions if provided
      if (openInstructions.trim()) {
        allAnswers.push(`הנחיות נוספות: ${openInstructions.trim()}`);
      }

      // Add PDF text if provided
      if (pdfText.trim()) {
        allAnswers.push(`תוכן מקובץ PDF: ${pdfText.trim()}`);
      }

      const response = await apiService.generateCustomSystemPrompt({
        answers: allAnswers,
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
      setIsGenerating(false);
    }
  };

  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">יוצר שאלות מותאמות</h2>
          <p className="text-muted-foreground" dir="rtl">
            המערכת יוצרת שאלות מותאמות ספציפית לעסק שלך...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="text-center space-y-4">
          <div className="p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
            {error}
          </div>
          <Button onClick={generateQuestions} variant="outline">
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">שאלות מותאמות</h2>
        <p className="text-muted-foreground" dir="rtl">
          השאלות הבאות מותאמות ספציפית לתחום ולמטרה של העסק שלך
        </p>
      </div>

      <div className="space-y-8">
        {questions.map((question, index) => (
          <div key={index} className="space-y-3 p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <Label className="text-lg font-medium text-foreground flex items-start gap-3" dir="rtl">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              <span className="pt-1">
                {question}
                <span className="text-destructive ml-1">*</span>
              </span>
            </Label>
            <Textarea
              value={answers[index]}
              onChange={(e) => updateAnswer(index, e.target.value)}
              placeholder="הקלד את תשובתך כאן..."
              className="min-h-[120px] resize-none"
              dir="rtl"
              required
            />
          </div>
        ))}

        {/* PDF Upload Section */}
        <div className="space-y-3 p-6 rounded-xl bg-gradient-to-r from-blue-500/5 to-blue-600/10 backdrop-blur border border-blue-500/20">
          <Label className="text-lg font-medium text-foreground flex items-start gap-3" dir="rtl">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center text-sm font-bold">
              📄
            </span>
            <span className="pt-1">
              העלאת קובץ PDF עם הנחיות נוספות
              <span className="text-muted-foreground ml-2 text-sm">(אופציונלי)</span>
            </span>
          </Label>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer transition-colors"
              >
                <Upload className="h-4 w-4" />
                {isUploadingPdf ? "מעלה קובץ..." : "בחר קובץ PDF"}
              </label>
              
              {pdfFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {pdfFile.name}
                </div>
              )}
            </div>
            
            {pdfText && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                  תוכן הקובץ:
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 max-h-32 overflow-y-auto">
                  {pdfText}
                </p>
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground" dir="rtl">
            ניתן להעלות קובץ PDF עם הנחיות מפורטות, תרחישי שיחה, או הסברים נוספים שיעזרו לסוכנת להתנהג בדיוק כמו שאתה רוצה
          </p>
        </div>

        {/* Open Instructions Section */}
        <div className="space-y-3 p-6 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 backdrop-blur border border-primary/20">
          <Label className="text-lg font-medium text-foreground flex items-start gap-3" dir="rtl">
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/30 text-primary flex items-center justify-center text-sm font-bold">
              💡
            </span>
            <span className="pt-1">
              הנחיות נוספות לסוכן
              <span className="text-muted-foreground ml-2 text-sm">(אופציונלי)</span>
            </span>
          </Label>
          <Textarea
            value={openInstructions}
            onChange={(e) => setOpenInstructions(e.target.value)}
            placeholder="הוסף הנחיות נוספות לסוכן שלך... לדוגמה: 'תמיד תזכיר את המחירים', 'היה ידידותי וחם', 'תמיד שאל על התקציב'..."
            className="min-h-[120px] resize-none"
            dir="rtl"
          />
          <p className="text-xs text-muted-foreground" dir="rtl">
            ההנחיות האלה יתווספו לסיסטם פרומפט של הסוכן ויעזרו לו להתנהג בדיוק כמו שאתה רוצה
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 pt-4">
        <Button type="button" onClick={onPrevious} variant="outline" className="flex-1 group">
          <ChevronLeft className="ml-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          חזור
        </Button>
        <Button type="submit" className="flex-1 group" variant="default" disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              יוצר System Prompt...
            </>
          ) : (
            <>
              צור System Prompt
              <ChevronRight className="mr-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
