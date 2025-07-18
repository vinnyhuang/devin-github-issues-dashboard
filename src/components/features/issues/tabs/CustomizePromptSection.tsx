import React from "react";
import { generateResolutionPromptTemplate } from "@/lib/utils";
import type { GitHubIssue, DevinAnalysisResult } from "@/lib/types";

interface CustomizePromptSectionProps {
  issue: GitHubIssue;
  analysisResult: DevinAnalysisResult;
  customizePrompt: boolean;
  customPrompt: string;
  onCustomizePromptChange: (checked: boolean) => void;
  onCustomPromptChange: (prompt: string) => void;
  checkboxId: string;
  textareaId: string;
}

export function CustomizePromptSection({
  issue,
  analysisResult,
  customizePrompt,
  customPrompt,
  onCustomizePromptChange,
  onCustomPromptChange,
  checkboxId,
  textareaId,
}: CustomizePromptSectionProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    onCustomizePromptChange(isChecked);
    
    // Pre-populate with template when checkbox is checked
    if (isChecked) {
      onCustomPromptChange(generateResolutionPromptTemplate(issue, analysisResult));
    } else {
      onCustomPromptChange("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={checkboxId}
          checked={customizePrompt}
          onChange={handleCheckboxChange}
          className="mr-2"
        />
        <label htmlFor={checkboxId} className="text-sm font-medium text-gray-700">
          Customize Prompt
        </label>
      </div>

      {customizePrompt && (
        <div>
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
            Resolution Prompt:
          </label>
          <textarea
            id={textareaId}
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
            placeholder="Enter custom resolution prompt..."
          />
        </div>
      )}
    </div>
  );
}