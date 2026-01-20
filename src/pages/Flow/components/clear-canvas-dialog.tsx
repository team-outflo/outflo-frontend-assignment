
'use client'

import { Trash2, AlertTriangle } from 'lucide-react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ClearCanvasDialogProps {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
}

export function ClearCanvasDialog({ isOpen, onConfirm, onCancel }: ClearCanvasDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
            <AlertDialogContent className="max-w-xl">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-lg">Clear the entire canvas?</AlertDialogTitle>
                    </div>
                </AlertDialogHeader>

                <AlertDialogDescription className="space-y-3 py-2">
                    <p className="text-sm text-foreground">This action will remove all steps and connections from your workflow.</p>
                    {/* <div className="space-y-2 text-sm">
                        <p className="font-medium text-foreground">What will be deleted:</p>
                        <ul className="space-y-1.5 text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>All action steps (connection requests, messages, InMails)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>All delays and wait times</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>All conditional checks and branches</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-red-600 mt-0.5">•</span>
                                <span>The entire workflow structure</span>
                            </li>
                        </ul>
                    </div> */}
                    <p className="text-xs text-muted-foreground italic mt-4">This action cannot be undone.</p>
                </AlertDialogDescription>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} className="mr-2">
                        Keep it
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear Canvas
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
