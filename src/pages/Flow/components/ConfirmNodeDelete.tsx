import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2 } from "lucide-react";

export default function ConfirmNodeDeleteDialog({
    isOpen,
    onKeep,
    onDelete,
    deletions,
}) {
    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-lg">
                            Delete this step?
                        </AlertDialogTitle>
                    </div>
                </AlertDialogHeader>
                <AlertDialogDescription className="space-y-3">
                    {deletions.length === 0 && (
                        <p>
                            Only this action step will be removed. Everything below it will smoothly continue under the step above.
                        </p>
                    )}
                    {deletions.includes("left-subtree") &&
                        deletions.includes("right-subtree") && <p>
                            This action step and all steps under it on both sides will be deleted.</p>}
                    {deletions.includes("left-subtree") &&
                        !deletions.includes("right-subtree") && <p>
                            This step and everything on its left side will be removed. The right side stays just the way it is.</p>}
                    {!deletions.includes("left-subtree") &&
                        deletions.includes("right-subtree") && <p>
                            This step and everything on its right side will be removed. The left side stays just the way it is.</p>}
                </AlertDialogDescription>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onKeep} className="mr-2">
                        Keep it
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDelete}
                        className="bg-red-600 text-white hover:bg-red-700"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
