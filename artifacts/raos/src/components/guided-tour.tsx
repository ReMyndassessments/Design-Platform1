import { useState, useEffect, useRef, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight, ChevronLeft, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TourStep {
  target?: string;
  title: string;
  content: ReactNode;
}

export function GuidedTour({ steps, isActive, onDismiss, onStepChange }: { steps: TourStep[], isActive: boolean, onDismiss: () => void, onStepChange?: (index: number) => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive && !wasActive.current) setCurrentStep(0);
    wasActive.current = isActive;
  }, [isActive]);

  useEffect(() => {
    if (onStepChange) onStepChange(currentStep);
    
    if (!isActive) return;
    const step = steps[currentStep];
    
    document.querySelectorAll('[data-tour-highlight="true"]').forEach(el => {
      el.removeAttribute('data-tour-highlight');
    });

    if (step?.target) {
      const el = document.querySelector(step.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.setAttribute('data-tour-highlight', 'true');
      }
    }

    return () => {
      document.querySelectorAll('[data-tour-highlight="true"]').forEach(el => {
        el.removeAttribute('data-tour-highlight');
      });
    };
  }, [currentStep, isActive, steps]);

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] animate-slide-up sm:bottom-8 sm:left-auto sm:right-8 sm:w-[340px]"
      role="dialog"
      aria-modal="false"
      aria-label={`Guided tour: ${step.title}`}
    >
      <Card className="border-primary/20 bg-white/95 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-black/5">
        <div className="h-1.5 w-full bg-slate-100">
          <div 
            className="h-full bg-primary transition-all duration-500 ease-out" 
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-display font-bold text-lg text-slate-900 leading-tight pr-4">{step.title}</h3>
            <button
              type="button"
              aria-label="Close guided tour"
              onClick={onDismiss}
              className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5 bg-slate-100 hover:bg-slate-200 rounded-full p-1 shrink-0"
            >
              <X size={14} strokeWidth={3} />
            </button>
          </div>
          <div className="text-slate-600 text-sm leading-relaxed mb-8 min-h-[4rem]">
            {step.content}
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {currentStep + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-slate-500 hover:text-slate-700"
                onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
                disabled={currentStep === 0}
              >
                <ChevronLeft size={16} />
              </Button>
              <Button 
                size="sm"
                className="h-8 px-4 font-semibold shadow-sm"
                onClick={() => {
                  if (currentStep === steps.length - 1) {
                    onDismiss();
                  } else {
                    setCurrentStep(s => Math.min(steps.length - 1, s + 1));
                  }
                }}
              >
                {currentStep === steps.length - 1 ? (
                  <><Check size={14} className="mr-1.5" /> Finish</>
                ) : (
                  <>Next <ChevronRight size={14} className="ml-1.5" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
