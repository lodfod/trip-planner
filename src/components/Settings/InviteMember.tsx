import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { UserPlus, Loader2, Mail, User } from "lucide-react";
import supabase from "../../lib/createClient";
import { useToast } from "../../hooks/use-toast";

interface InviteMemberProps {
  currentUserId: string;
  onMemberInvited: () => void;
}

export function InviteMember({ currentUserId, onMemberInvited }: InviteMemberProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInvite = async () => {
    if (!email.trim() || !displayName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both email and display name",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if this email already exists as a registered user
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, email")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (existingProfile) {
        toast({
          title: "User already exists",
          description: "This person is already registered. They appear in the member list.",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if already invited
      const { data: existingPending } = await supabase
        .from("pending_members")
        .select("id")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (existingPending) {
        toast({
          title: "Already invited",
          description: "This email has already been invited",
        });
        setIsSubmitting(false);
        return;
      }

      // Create pending member
      const { error } = await supabase.from("pending_members").insert({
        email: email.trim().toLowerCase(),
        display_name: displayName.trim(),
        invited_by: currentUserId,
      });

      if (error) throw error;

      toast({
        title: "Member invited",
        description: `${displayName} can now be assigned to expenses. When they sign up with ${email}, their expenses will transfer automatically.`,
      });

      setOpen(false);
      setEmail("");
      setDisplayName("");
      onMemberInvited();
    } catch (error) {
      console.error("Error inviting member:", error);
      toast({
        title: "Error",
        description: "Failed to invite member. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Trip Member</DialogTitle>
          <DialogDescription>
            Add someone who hasn't signed up yet. They can be assigned to expenses now,
            and when they sign up with this email, everything will transfer automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="displayName"
                placeholder="How should we call them?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This name will appear in expense splits
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
