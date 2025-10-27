import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ResultStepProps {
  systemPrompt: string;
  onRestart: () => void;
}

export const ResultStep = ({ systemPrompt, onRestart }: ResultStepProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(systemPrompt);
      setCopied(true);
      toast.success("הועתק ללוח!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("שגיאה בהעתקה");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([systemPrompt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "system-prompt.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("הקובץ הורד בהצלחה!");
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2 mb-8">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          System Prompt שלך מוכן!
        </h2>
        <p className="text-muted-foreground" dir="rtl">
          הפרומפט נוצר בהתאם לתשובות שסיפקת
        </p>
      </div>

      <Card className="p-6 bg-card/50 backdrop-blur-sm border-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground">System Prompt</h3>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "הועתק" : "העתק"}
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                הורד
              </Button>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground" dir="ltr">
              {systemPrompt}
            </pre>
          </div>
        </div>
      </Card>

      <Button onClick={onRestart} variant="outline" className="w-full">
        התחל מחדש
      </Button>
    </div>
  );
};
