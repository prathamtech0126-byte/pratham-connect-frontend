import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

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
}

export function MultiStepFormWrapper({ title, steps, onSubmit, isSubmitting }: MultiStepFormWrapperProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
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
        <div className="absolute top-4 left-0 w-full h-0.5 bg-muted -z-0">
          <div 
            className="absolute top-0 h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
        <div className="relative flex justify-between w-full">
          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center relative">
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
            </div>
          ))}
        </div>
      </div>

      <Card className="border-none shadow-md">
        <CardHeader>
          <CardTitle>{steps[currentStep].title}</CardTitle>
        </CardHeader>
        <CardContent>
          {steps[currentStep].component}
        </CardContent>
        <CardFooter className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button onClick={handleNext} disabled={isSubmitting}>
            {currentStep === steps.length - 1 ? (
              isSubmitting ? "Saving..." : "Submit"
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
