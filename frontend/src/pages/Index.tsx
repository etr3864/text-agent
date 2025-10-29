import { useState } from "react";
import { WizardProgress } from "@/components/WizardProgress";
import { PersonalInfoStep } from "@/components/PersonalInfoStep";
import { BasicQuestionsStep } from "@/components/BasicQuestionsStep";
import { DynamicQuestionsStep } from "@/components/DynamicQuestionsStep";
import { ResultStep } from "@/components/ResultStep";
import ShaderBackground from "@/components/ui/shader-background";

interface PersonalInfo {
  name: string;
  phone: string;
  businessName: string;
  customerGender: string;
}

interface BasicAnswers {
  businessName: string;
  businessField: string;
  businessGoal: string;
}

const STEP_NAMES = ["פרטים אישיים", "פרטי העסק", "שאלות מותאמות", "תוצאה"];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({ 
    name: "", 
    phone: "", 
    businessName: "", 
    customerGender: "" 
  });
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
    setPersonalInfo({ name: "", phone: "", businessName: "", customerGender: "" });
    setBasicAnswers({ businessName: "", businessField: "", businessGoal: "" });
    setGeneratedPrompt("");
    setSystemPromptId("");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Shader Background */}
      <ShaderBackground />
      
      {/* Subtle Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top duration-700">
          <div className="mb-8 flex justify-center">
            <img 
              src="https://res.cloudinary.com/daowx6msw/image/upload/v1761607495/white_logogg_uf3usn.png" 
              alt="Optive Logo" 
              className="h-40 md:h-52 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ fontFamily: "'Rubik', sans-serif" }}>
            <span className="text-white">ברוך הבא למערכת ההדמיות של </span>
            <span className="relative inline-block px-8">
              <span className="relative z-10 bg-gradient-to-r from-purple-600 via-purple-500 to-purple-700 bg-clip-text text-transparent font-extrabold tracking-wide">
                Optive
              </span>
              <span className="absolute inset-0 blur-xl bg-gradient-to-r from-purple-600/40 via-purple-500/40 to-purple-700/40 animate-pulse"></span>
            </span>
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto" dir="rtl" style={{ fontFamily: "'Rubik', sans-serif" }}>
            הדמיה חיה שהופכת כל שיחה לעסקה - תן ללקוחות שלך להתנסות במוצר לפני שהם קונים
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
              customerGender={personalInfo.customerGender}
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
