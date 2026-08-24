import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";
import { Button } from "@/components/kumo";

export function CopyButton({
  text,
  className,
  label,
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (label) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={className}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="text-kumo-success" /> : <Copy />}
        {copied ? "Copied" : label}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      shape="square"
      className={className}
      title={copied ? "Copied!" : "Copy"}
      aria-label="Copy to clipboard"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="text-kumo-success" /> : <Copy />}
    </Button>
  );
}
