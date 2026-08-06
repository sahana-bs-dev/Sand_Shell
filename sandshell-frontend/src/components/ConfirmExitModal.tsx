"use client";

import { ReactNode } from "react";

interface ConfirmExitModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmExitModal({
  isOpen,
  onConfirm,
  onCancel,
  title = "End Session?",
  message = "Your SandShell terminal session will be closed and the container will be destroyed. This action cannot be undone.",
  confirmText = "End Session",
  cancelText = "Cancel",
}: ConfirmExitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl">
        {/* Warning Icon */}
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-yellow-500/20 p-3">
            <svg
              className="h-6 w-6 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 6v2m0 0v2"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-lg font-semibold text-foreground">
          {title}
        </h2>

        {/* Message */}
        <p className="mb-6 text-center text-sm text-muted-foreground">
          {message}
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600 active:scale-95"
          >
            {confirmText}
          </button>
        </div>

        {/* Info Text */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          💡 Tip: You can always start a new session later
        </p>
      </div>
    </div>
  );
}