import { forwardRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Bold, Italic, List, Code } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export const RichTextEditor = forwardRef<HTMLTextAreaElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, rows = 8, ...props }, ref) => {
    const insertMarkdown = (prefix: string, suffix: string = "") => {
      const textarea = ref as React.RefObject<HTMLTextAreaElement>;
      if (!textarea.current) return;

      const start = textarea.current.selectionStart;
      const end = textarea.current.selectionEnd;
      const selectedText = value.substring(start, end);
      const beforeText = value.substring(0, start);
      const afterText = value.substring(end);

      const newText = `${beforeText}${prefix}${selectedText}${suffix}${afterText}`;
      onChange(newText);

      // Reset cursor position
      setTimeout(() => {
        if (textarea.current) {
          textarea.current.focus();
          textarea.current.setSelectionRange(
            start + prefix.length,
            start + prefix.length + selectedText.length
          );
        }
      }, 0);
    };

    return (
      <div className="border border-gray-300 rounded-lg">
        <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 rounded-t-lg">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("**", "**")}
              className="p-1 h-auto"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("*", "*")}
              className="p-1 h-auto"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("- ")}
              className="p-1 h-auto"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertMarkdown("`", "`")}
              className="p-1 h-auto"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="border-0 rounded-t-none resize-none focus-visible:ring-0"
          {...props}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";
