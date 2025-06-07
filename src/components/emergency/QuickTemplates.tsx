
import React from 'react';
import { Button } from '@/components/ui/button';

interface QuickTemplate {
  id: string;
  message: string;
  label: string;
}

interface QuickTemplatesProps {
  templates: QuickTemplate[];
  onTemplateClick: (template: QuickTemplate) => void;
  selectedContacts: string[];
  isLoading: boolean;
}

const QuickTemplates = ({ templates, onTemplateClick, selectedContacts, isLoading }: QuickTemplatesProps) => {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-2 block">
        Quick Send (1-tap):
      </label>
      <div className="grid grid-cols-1 gap-2">
        {templates.map((template) => (
          <Button
            key={template.id}
            onClick={() => onTemplateClick(template)}
            disabled={selectedContacts.length === 0 || isLoading}
            variant="outline"
            className="justify-start text-left h-auto py-3 px-4"
          >
            <div>
              <div className="font-medium text-sm">{template.label}</div>
              <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                {template.message}
              </div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickTemplates;
