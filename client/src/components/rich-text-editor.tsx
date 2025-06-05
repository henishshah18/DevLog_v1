import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const RichTextEditor = forwardRef<HTMLTextAreaElement, RichTextEditorProps>(
  ({ value, onChange, placeholder = "Enter your text...", rows = 6 }, ref) => {
    return (
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="min-h-[150px] resize-none"
      />
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";