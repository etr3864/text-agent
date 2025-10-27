import { useState } from "react";
import { WizardProgress } from "@/components/WizardProgress";
import { PersonalInfoStep } from "@/components/PersonalInfoStep";
import { BasicQuestionsStep } from "@/components/BasicQuestionsStep";
import { DynamicQuestionsStep } from "@/components/DynamicQuestionsStep";
import { ResultStep } from "@/components/ResultStep";
import { Sparkles } from "lucide-react";
import optiveLogo from "@/assets/optive-logo.png";

interface PersonalInfo {
  name: string;
  phone: string;
}

interface BasicAnswers {
  businessName: string;
  businessField: string;
  businessGoal: string;
}

const STEP_NAMES = ["פרטים אישיים", "פרטי העסק", "שאלות מותאמות", "תוצאה"];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ name: "", phone: "" });
  const [basicAnswers, setBasicAnswers] = useState<BasicAnswers>({ 
    businessName: "", 
    businessField: "", 
    businessGoal: "" 
  });
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [systemPromptId, setSystemPromptId] = useState<string>("");

  const handlePersonalInfoNext = (data: PersonalInfo) => {
    setPersonalInfo(data);
    setCurrentStep(1);
  };

  const handleBasicQuestionsNext = (data: BasicAnswers) => {
    setBasicAnswers(data);
    setCurrentStep(2);
  };

  const handleQuestionNext = (systemPrompt: string, promptId?: string) => {
    setGeneratedPrompt(systemPrompt);
    if (promptId) {
      setSystemPromptId(promptId);
    }
    setCurrentStep(3);
  };

  const handlePromptUpdate = (newPrompt: string) => {
    setGeneratedPrompt(newPrompt);
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setPersonalInfo({ name: "", phone: "" });
    setBasicAnswers({ businessName: "", businessField: "", businessGoal: "" });
    setGeneratedPrompt("");
    setSystemPromptId("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${optiveLogo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
          <div className="mb-8 flex justify-center">
          </div>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4 backdrop-blur-sm border border-primary/20">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Optive-LDT AI System Prompt Generator</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary-glow bg-clip-text text-transparent">
            יצירת System Prompt מותאם אישית
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" dir="rtl">
            ענה על כמה שאלות קצרות ונייצר עבורך פרומפט מותאם במיוחד לצרכים שלך
          </p>
        </div>

        {/* Progress */}
        <WizardProgress steps={STEP_NAMES} currentStep={currentStep} />

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 0 && (
            <PersonalInfoStep onNext={handlePersonalInfoNext} initialData={personalInfo} />
          )}

          {currentStep === 1 && (
            <BasicQuestionsStep 
              onNext={handleBasicQuestionsNext}
              onPrevious={handlePrevious}
              initialAnswers={basicAnswers}
              userPhone={personalInfo.phone}
            />
          )}

          {currentStep === 2 && (
            <DynamicQuestionsStep
              onNext={handleQuestionNext}
              onPrevious={handlePrevious}
              basicAnswers={basicAnswers}
              userPhone={personalInfo.phone}
            />
          )}

          {currentStep === 3 && (
            <ResultStep 
              systemPrompt={generatedPrompt} 
              systemPromptId={systemPromptId}
              onRestart={handleRestart}
              onPromptUpdate={handlePromptUpdate}
              userPhone={personalInfo.phone}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
