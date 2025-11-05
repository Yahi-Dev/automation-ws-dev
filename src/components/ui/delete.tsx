"use client"

import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./dialog"
import { CircleAlert, Trash2 } from "lucide-react"


interface DeleteConfirmationModalProps {
  onConfirm: () => void
  children: React.ReactNode
  className?: string
  entityName?: string
  description?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteConfirmationModal({
  onConfirm,
  children,
  className,
  entityName = "este registro",
  description = "Esta acción no se puede deshacer. Se eliminará permanentemente este registro y todos sus datos asociados.",
  open,
  onOpenChange
}: DeleteConfirmationModalProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild className={cn(className)}>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-lg">
        <div className="flex flex-col space-y-4">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5">
              <CircleAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle className="text-left text-lg font-semibold">
                  Are you sure you want to delete {entityName}?
                </DialogTitle>
                <DialogDescription className="text-left text-muted-foreground">
                  {description}
                </DialogDescription>
              </DialogHeader>
            </div>
          </div>

          <DialogFooter className="flex justify-end space-x-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="px-6 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                type="button"
                variant="destructive"
                onClick={onConfirm}
                className="px-6 shadow-sm hover:bg-destructive/90 cursor-pointer"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete permanently
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}