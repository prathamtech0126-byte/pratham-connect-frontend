import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";

interface Step {
  id: string;
  title: string;
  component: React.ReactNode;
}

interface MultiStepFormWrapperProps {
  title: string;
  steps: Step[];
  onSubmit: () => void;
  isSubmitting?: boolean;
  onSaveDraft?: () => void;
  onStepChange?: (currentStep: number, nextStep: number) => Promise<boolean>;
}

export function MultiStepFormWrapper({ title, steps, onSubmit, isSubmitting, onSaveDraft, onStepChange }: MultiStepFormWrapperProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const prevStepsLengthRef = useRef(steps.length);
  const prevStepIdsRef = useRef(steps.map(s => s.id));

  // Reset currentStep when steps array changes (e.g., when sales type changes)
  useEffect(() => {
    const currentStepIds = steps.map(s => s.id);
    const prevStepIds = prevStepIdsRef.current;

    // If steps changed (different IDs or different length), reset to step 0
    if (
      steps.length !== prevStepsLengthRef.current ||
      JSON.stringify(currentStepIds) !== JSON.stringify(prevStepIds)
    ) {
      // If current step is out of bounds or step structure changed, reset to first step
      if (currentStep >= steps.length || currentStepIds[currentStep] !== prevStepIds[currentStep]) {
        setCurrentStep(0);
      }
      prevStepsLengthRef.current = steps.length;
      prevStepIdsRef.current = currentStepIds;
    }
  }, [steps, currentStep]);

  const handleNext = async () => {
    // ✅ Prevent multiple clicks during submission
    if (isSubmitting) {
      console.log('[MultiStepFormWrapper] Already submitting, ignoring click');
      return;
    }

    // Ensure currentStep is within valid range
    if (currentStep >= steps.length) {
      setCurrentStep(0);
      return;
    }

    if (currentStep < steps.length - 1) {
      if (onStepChange) {
        const isValid = await onStepChange(currentStep, currentStep + 1);
        if (!isValid) return;
      }
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      onSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="relative mb-8">
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted z-0">
          <div
            className="absolute top-0 h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="relative flex justify-between w-full">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                // Only allow navigation to previous steps (steps that have been completed)
                // This prevents accessing steps that shouldn't be available
                if (index < currentStep && index < steps.length) {
                  setCurrentStep(index);
                }
              }}
              className={cn(
                "flex flex-col items-center relative transition-all duration-200",
                index < currentStep ? "cursor-pointer hover:opacity-80" : "cursor-default"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-300 bg-background z-10 relative",
                  index <= currentStep ? "border-primary text-primary" : "border-muted text-muted-foreground",
                  index < currentStep && "bg-primary text-primary-foreground"
                )}
              >
                {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={cn(
                "absolute top-10 text-xs font-medium hidden md:block whitespace-nowrap",
                index <= currentStep ? "text-primary" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl font-bold">{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pt-4">
            {steps[currentStep].component}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between pt-10 pb-10">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-8 rounded-xl h-12 bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            {onSaveDraft && (
              <Button variant="secondary" onClick={onSaveDraft}>
                Save Draft
              </Button>
            )}
          </div>
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className={`px-10 rounded-xl h-12 font-semibold ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-[#0061D1] hover:bg-[#0051B1] text-white'
            }`}
          >
            {currentStep === steps.length - 1 ? (
              isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Submit"
              )
            ) : (
              <>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
