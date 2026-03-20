"use client";

import { BottomSheet } from "@/shared/components/bottom-sheet";
import { Button } from "@/shared/components/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  confirmLabel = "삭제",
  description,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <BottomSheet description={description} onClose={onClose} open={open} title={title}>
      <div className="space-y-3">
        <Button fullWidth onClick={onConfirm} variant="danger">
          {confirmLabel}
        </Button>
        <Button fullWidth onClick={onClose} variant="ghost">
          취소
        </Button>
      </div>
    </BottomSheet>
  );
}
