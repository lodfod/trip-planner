import { Button } from "../components/ui/button";

import { Icons } from "../components/ui/icons";

import supabase from "../lib/createClient";
import { getRedirectURL } from "../lib/getRedirectURL";

// test
const Auth = ({
  setIsLoading,
  isLoading,
}: {
  setIsLoading: (isLoading: boolean) => void;
  isLoading: boolean;
}) => {
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getRedirectURL(),
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="flex flex-col justify-start text-left">
        <h1 className="text-2xl font-bold pb-3">Japan Trip 2025</h1>
        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          aria-label="Sign in with Google"
        >
          {isLoading ? (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icons.google className="mr-2 h-4 w-4" />
          )}
          Sign in with Google
        </Button>
        <p className="text-[9px] pt-1 text-gray-500 pt-3">
          Use your Google account to sign in
        </p>
      </div>
    </div>
  );
};

export default Auth;
