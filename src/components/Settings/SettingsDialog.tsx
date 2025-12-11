import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Loader2, Save, UserX } from "lucide-react";
import supabase from "../../lib/createClient";
import { useToast } from "../../hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export function SettingsDialog({
  open,
  onOpenChange,
  userId,
  email,
  fullName,
  avatarUrl,
}: SettingsDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const { toast } = useToast();

  // Load current profile on open
  useEffect(() => {
    if (open) {
      loadProfile();
    }
  }, [open, userId]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setDisplayName(data?.display_name || "");
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your display name has been saved",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveTrip = async () => {
    setIsLeaving(true);
    try {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("id", userId);

      if (error) throw error;

      toast({
        title: "Left trip",
        description: "You have been removed from the trip. Your past expenses will remain.",
      });

      onOpenChange(false);

      // Sign out the user
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error leaving trip:", error);
      toast({
        title: "Error",
        description: "Failed to leave trip",
        variant: "destructive",
      });
    } finally {
      setIsLeaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Update your display name and preferences.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile info */}
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg">
                  {getInitials(displayName || fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{displayName || fullName}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            {/* Display name input */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={fullName}
              />
              <p className="text-xs text-muted-foreground">
                This is how your name will appear to others in the group.
                Leave blank to use your Google account name.
              </p>
            </div>

            {/* Full name (read-only) */}
            <div className="space-y-2">
              <Label>Full Name (from Google)</Label>
              <Input value={fullName} disabled className="bg-muted" />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} disabled className="bg-muted" />
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            {/* Danger zone - Leave Trip */}
            <div className="pt-4 mt-4 border-t border-destructive/20">
              <h4 className="text-sm font-medium text-destructive mb-2">Danger Zone</h4>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full" disabled={isLeaving}>
                    {isLeaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Leaving...
                      </>
                    ) : (
                      <>
                        <UserX className="mr-2 h-4 w-4" />
                        Leave Trip
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove you from the trip. You will no longer appear in the list of people who can be added to new expenses.
                      <br /><br />
                      <strong>Your existing expenses will remain unchanged.</strong> Any money you owe or are owed will still be tracked.
                      <br /><br />
                      You will be signed out after leaving.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeaveTrip}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, leave trip
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <p className="text-xs text-muted-foreground mt-2">
                Your existing expenses will remain, but you won't be available for new expenses.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
